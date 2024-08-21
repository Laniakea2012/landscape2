//! This module defines some types used to represent the information collected
//! from Gitee for each of the landscape items repositories (when applicable),
//! as well as the functionality used to collect that information.

use super::{cache::Cache, LandscapeData};
use anyhow::{format_err, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use deadpool::unmanaged::{Object, Pool};
use futures::stream::{self, StreamExt};
use landscape2_core::data::{Commit, Contributors, GithubData, Release, RepositoryGithubData};
use lazy_static::lazy_static;
#[cfg(test)]
use mockall::automock;
use octorust::types::ParticipationStats;
use regex::Regex;
use reqwest::header::{self, HeaderMap, HeaderValue};
use std::collections::BTreeMap;
use std::env;
use tracing::{debug, instrument, warn};
use serde::{Serialize, Deserialize};

type GiteeData = GithubData;
type RepositoryGiteeData = RepositoryGithubData;

/// File used to cache data collected from Gitee.
const GITEE_CACHE_FILE: &str = "gitee.json";

/// How long the Gitee data in the cache is valid (in days).
const GITEE_CACHE_TTL: i64 = 7;

/// Environment variable containing a comma separated list of Gitee tokens.
const GITEE_TOKENS: &str = "GITEE_TOKENS";

/// Collect Gitee data for each of the items repositories in the landscape,
/// reusing cached data whenever possible.
#[instrument(skip_all, err)]
pub(crate) async fn collect_gitee_data(cache: &Cache, landscape_data: &LandscapeData) -> Result<GiteeData> {
    debug!("collecting repositories information from gitee (this may take a while)");

    // Read cached data (if available)
    let mut cached_data: Option<GiteeData> = None;
    match cache.read(GITEE_CACHE_FILE) {
        Ok(Some((_, json_data))) => match serde_json::from_slice(&json_data) {
            Ok(gitee_data) => cached_data = Some(gitee_data),
            Err(err) => warn!("error parsing gitee cache file: {err:?}"),
        },
        Ok(None) => {}
        Err(err) => warn!("error reading gitee cache file: {err:?}"),
    }

    // Setup Gitee API clients pool if any tokens have been provided
    let tokens: Option<Vec<String>> = match env::var(GITEE_TOKENS) {
        Ok(tokens) if !tokens.is_empty() => Some(tokens.split(',').map(ToString::to_string).collect()),
        Ok(_) | Err(_) => None,
    };
    let gt_pool: Option<Pool<DynGT>> = if let Some(tokens) = &tokens {
        let mut gt_clients: Vec<DynGT> = vec![];
        for token in tokens {
            let gt = Box::new(GTApi::new(token)?);
            gt_clients.push(gt);
        }
        Some(Pool::from(gt_clients))
    } else {
        warn!("gitee tokens not provided: no information will be collected from gitee");
        None
    };

    // Collect urls of the repositories to process
    let mut urls = vec![];
    for item in &landscape_data.items {
        if let Some(repositories) = &item.repositories {
            for repo in repositories {
                if GITEE_REPO_URL.is_match(&repo.url) {
                    urls.push(&repo.url);
                }
            }
        }
    }
    urls.sort();
    urls.dedup();

    // Collect repositories information from Gitee, reusing cached data when available
    let concurrency = if let Some(tokens) = tokens {
        tokens.len()
    } else {
        1
    };
    let gitee_data: GiteeData = stream::iter(urls)
        .map(|url| async {
            let url = url.clone();

            // Use cached data when available if it hasn't expired yet
            if let Some(cached_repo) = cached_data.as_ref().and_then(|cache| {
                cache.get(&url).and_then(|repo| {
                    if repo.generated_at + chrono::Duration::days(GITEE_CACHE_TTL) > Utc::now() {
                        Some(repo)
                    } else {
                        None
                    }
                })
            }) {
                (url, Ok(cached_repo.clone()))
            }
            // Otherwise we pull it from Gitee if any tokens were provided
            else if let Some(gt_pool) = &gt_pool {
                let gt = gt_pool.get().await.expect("token -when available-");
                (url.clone(), collect_repository_data(gt, &url).await)
            } else {
                (url.clone(), Err(format_err!("no tokens provided")))
            }
        })
        .buffer_unordered(concurrency)
        .collect::<BTreeMap<String, Result<RepositoryGiteeData>>>()
        .await
        .into_iter()
        .filter_map(|(url, result)| {
            if let Ok(gitee_data) = result {
                Some((url, gitee_data))
            } else {
                None
            }
        })
        .collect();

    // Write data (in json format) to cache
    cache.write(GITEE_CACHE_FILE, &serde_json::to_vec_pretty(&gitee_data)?)?;

    debug!("done!");
    Ok(gitee_data)
}

/// Collect repository data from Gitee.
#[instrument(skip_all, err)]
async fn collect_repository_data(gt: Object<DynGT>, repo_url: &str) -> Result<RepositoryGiteeData> {
    // Collect some information from Gitee
    let (owner, repo) = get_owner_and_repo(repo_url)?;
    let gt_repo = gt.get_repository(&owner, &repo).await?;
    let contributors_count = gt.get_contributors_count(&owner, &repo).await?;
    let first_commit = gt.get_first_commit(&owner, &repo, &gt_repo.default_branch).await?;
    let languages = gt.get_languages(&owner, &repo).await?;
    let latest_commit = gt.get_latest_commit(&owner, &repo, &gt_repo.default_branch).await?;
    let latest_release = gt.get_latest_release(&owner, &repo).await?;
    let participation_stats = gt.get_participation_stats(&owner, &repo).await?.all;

    // Prepare repository instance using the information collected
    Ok(RepositoryGiteeData {
        generated_at: Utc::now(),
        contributors: Contributors {
            count: contributors_count,
            url: format!("https://gitee.com/{owner}/{repo}/graphs/contributors"),
        },
        description: gt_repo.description,
        first_commit,
        languages,
        latest_commit,
        latest_release,
        // license: gt_repo.license.and_then(|l| {
        //     if l.name == "NOASSERTION" {
        //         None
        //     } else {
        //         Some(l.name)
        //     }
        // }),
        license: Some("TODO".to_string()),
        participation_stats,
        stars: gt_repo.stargazers_count,
        topics: gt_repo.topics,
        url: gt_repo.html_url,
    })
}

/// Gitee API base url.
const GITEE_API_URL: &str = "https://gitee.com/api/v5/";

/// Type alias to represent a GT trait object.
type DynGT = Box<dyn GT + Send + Sync>;

/// Trait that defines some operations a GT implementation must support.
#[async_trait]
#[cfg_attr(test, automock)]
trait GT {
    /// Get number of repository contributors.
    async fn get_contributors_count(&self, owner: &str, repo: &str) -> Result<usize>;

    /// Get first commit.
    async fn get_first_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Option<Commit>>;

    /// Get languages used in repository.
    async fn get_languages(&self, owner: &str, repo: &str) -> Result<Option<BTreeMap<String, i64>>>;

    /// Get latest commit.
    async fn get_latest_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Commit>;

    /// Get latest release.
    async fn get_latest_release(&self, owner: &str, repo: &str) -> Result<Option<Release>>;

    /// Get participation stats.
    async fn get_participation_stats(&self, owner: &str, repo: &str) -> Result<ParticipationStats>;

    /// Get repository.
    async fn get_repository(&self, owner: &str, repo: &str) -> Result<PartRepository>;
}

/// GT implementation backed by the Gitee API.
struct GTApi {
    http_client: reqwest::Client,
}

// #[derive(Serialize, Deserialize)]
struct PartRepository {
    // #[serde(
    //     default,
    //     skip_serializing_if = "String::is_empty",
    //     deserialize_with = "crate::utils::deserialize_null_string::deserialize"
    // )]
    pub default_branch: String,
    // #[serde(
    //     default,
    //     skip_serializing_if = "String::is_empty",
    //     deserialize_with = "crate::utils::deserialize_null_string::deserialize"
    // )]
    pub description: String,
    // #[serde(default, skip_serializing_if = "Option::is_none")]
    pub license: Option<Vec<String>>,
    // #[serde(
    //     default,
    //     skip_serializing_if = "crate::utils::zero_i64",
    //     deserialize_with = "crate::utils::deserialize_null_i64::deserialize"
    // )]
    pub stargazers_count: i64,
    // #[serde(
    //     default,
    //     skip_serializing_if = "Vec::is_empty",
    //     deserialize_with = "crate::utils::deserialize_null_vector::deserialize"
    // )]
    pub topics: Vec<String>,
    // #[serde(
    //     default,
    //     skip_serializing_if = "String::is_empty",
    //     deserialize_with = "crate::utils::deserialize_null_string::deserialize"
    // )]
    pub html_url: String
}

impl GTApi {
    /// Create a new GTApi instance.
    fn new(token: &str) -> Result<Self> {
        // Setup octorust Gitee API client
        let user_agent = format!("{}/{}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));

        // Setup HTTP client ready to make requests to the Gitee API
        // (for some operations that cannot be done with the octorust client)
        let mut headers = HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
        );
        let http_client =
            reqwest::Client::builder().user_agent(user_agent).default_headers(headers).build()?;

        Ok(Self {
            http_client,
        })
    }
}

#[async_trait]
impl GT for GTApi {
    /// [GT::get_contributors_count]
    #[instrument(skip(self), err)]
    async fn get_contributors_count(&self, owner: &str, repo: &str) -> Result<usize> {
        let url = format!("{GITEE_API_URL}/repos/{owner}/{repo}/contributors?type=committers");
        let response = self.http_client.head(url).send().await?;
        let count = get_last_page(response.headers())?.unwrap_or(1);
        Ok(count)
    }

    /// [GT::get_first_commit]
    #[allow(clippy::cast_possible_wrap)]
    #[instrument(skip(self), err)]
    async fn get_first_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Option<Commit>> {
        // Get last commits page
        let url = format!("{GITEE_API_URL}/repos/{owner}/{repo}/commits?sha={ref_}&per_page=1");
        let response = self.http_client.head(url).send().await?;
        let last_page = get_last_page(response.headers())?.unwrap_or(1);

        // Get first repository commit and return it if found
        // if let Some(commit) = self
        //     .gt_client
        //     .repos()
        //     .list_commits(owner, repo, ref_, "", "", None, None, 1, last_page as i64)
        //     .await?
        //     .body
        //     .pop()
        // {
        //     return Ok(Some(new_commit_from(commit)));
        // }
        Ok(None)
    }

    /// [GT::get_languages]
    #[instrument(skip(self), err)]
    async fn get_languages(&self, owner: &str, repo: &str) -> Result<Option<BTreeMap<String, i64>>> {
        let url = format!("{GITEE_API_URL}/repos/{owner}/{repo}/languages");
        let languages: BTreeMap<String, i64> = self.http_client.get(url).send().await?.json().await?;
        Ok(Some(languages))
    }

    /// [GT::get_latest_commit]
    #[instrument(skip(self), err)]
    async fn get_latest_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Commit> {
        // let response = self.gt_client.repos().get_commit(owner, repo, 1, 1, ref_).await?;
        Ok(Commit {
            ts: None,
            url: String::from("https://example.com"),
        })
    }

    /// [GT::get_latest_release]
    #[instrument(skip(self), err)]
    async fn get_latest_release(&self, owner: &str, repo: &str) -> Result<Option<Release>> {
        Ok(Some(Release{
            ts: None,
            url: String::new(),
        }))
    }

    /// [GT::get_participation_stats]
    #[instrument(skip(self), err)]
    async fn get_participation_stats(&self, owner: &str, repo: &str) -> Result<ParticipationStats> {
        Ok(ParticipationStats{all: vec![], owner: vec![]})
    }

    /// [GT::get_repository]
    #[instrument(skip(self), err)]
    async fn get_repository(&self, owner: &str, repo: &str) -> Result<PartRepository> {
        let url = format!("{GITEE_API_URL}/repos/{owner}/{repo}");
        let response = self.http_client.head(url).send().await?;
        println!("{:?}", response);
        Ok(PartRepository {
            default_branch: String::default(),
            description: String::default(),
            license: None,
            stargazers_count: i64::default(),
            topics: Vec::default(),
            html_url: String::default(),
        })
    }
}

lazy_static! {
    /// Gitee repository url regular expression.
    pub(crate) static ref GITEE_REPO_URL: Regex =
        Regex::new("^https://gitee.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/?$")
            .expect("exprs in GITEE_REPO_URL to be valid");
}

/// Return the last page of results available from the headers provided.
fn get_last_page(headers: &HeaderMap) -> Result<Option<usize>> {
    if let Some(link_header) = headers.get("link") {
        let rels = parse_link_header::parse_with_rel(link_header.to_str()?)?;
        if let Some(last_page_url) = rels.get("last") {
            if let Some(last_page) = last_page_url.queries.get("page") {
                return Ok(Some(last_page.parse()?));
            }
        }
    }
    Ok(None)
}

/// Extract the owner and repository from the repository url provided.
fn get_owner_and_repo(repo_url: &str) -> Result<(String, String)> {
    let c = GITEE_REPO_URL.captures(repo_url).ok_or_else(|| format_err!("invalid repository url"))?;
    Ok((c["owner"].to_string(), c["repo"].to_string()))
}

/// Create a new commit instance from the octorust commit data provided.
fn new_commit_from(value: octorust::types::CommitDataType) -> Commit {
    let mut commit = Commit {
        url: value.html_url,
        ts: None,
    };
    if let Some(author) = value.commit.author {
        commit.ts = Some(DateTime::parse_from_rfc3339(&author.date).expect("date to be valid").into());
    }
    commit
}

/// Create a new release instance from the octorust release data provided.
fn new_release_from(value: octorust::types::Release) -> Release {
    Release {
        ts: value.published_at,
        url: value.html_url,
    }
}
