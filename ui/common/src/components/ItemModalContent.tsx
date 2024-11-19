import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';
import { css } from 'solid-styled-components';

import { AdditionalCategory, Item, Repository, SecurityAudit, SVGIconKind } from '../types/types';
import { cutString, getItemDescription } from '../utils';
import { formatProfitLabel } from '../utils/formatProfitLabel';
import { formatTAGName } from '../utils/formatTAGName';
import { prettifyNumber } from '../utils/prettifyNumber';
import { AcquisitionsTable } from './AcquisitionsTable';
import { Badge } from './Badge';
import { Box } from './Box';
import { CollapsableText } from './CollapsableText';
import { ExternalLink } from './ExternalLink';
import { FoundationBadge } from './FoundationBadge';
import { FundingRoundsTable } from './FundingRoundsTable';
import { Image } from './Image';
import { ImageName } from './ImageName';
import { ItemDropdown } from './ItemDropdown';
import { MaturityBadge } from './MaturityBadge';
import { MaturitySection } from './MaturitySection';
import { ParentProject } from './ParentProject';
import { RepositoriesSection } from './RepositoriesSection';
import { SVGIcon } from './SVGIcon';
import { MyTable } from './MyTable';

interface Props {
  item?: Item | null;
  parentInfo?: Item | null;
  foundation: string;
  basePath?: string;
  onClose?: () => void;
}
const compassLogo = css`
  padding-top: 6px;
  color: #333;
  width: 100px;
  height: 30px;
`;
const compass = css`
  gap: 4px;
  display: flex;
  justify-content: end;
  align-items: center;
  text-align: right;
  font-size: 0.8rem;
  line-height: 0.8rem;
  margin-top: 0.5rem;
`;
const LogoWrapper = css`
  height: 140px;
  width: 150px;
  min-width: 100px;
`;

const Logo = css`
  font-size: 3rem;
  max-width: 100%;
  max-height: 100%;
  height: auto;
`;

const ItemInfo = css`
  background-color: #f8f9fa;
  width: calc(100% - 100px - 1rem);
  height: 140px;
  padding: 1rem 1.5rem;
`;

const Title = css`
  font-size: 1.5rem;
  line-height: 1.75rem;
`;

const TitleInSection = css`
  font-size: 0.8rem;
  opacity: 0.5;
`;

// const Name = css`
//   padding-bottom: 5px;
// `;

const Description = css`
  font-size: 0.9rem !important;
`;

const OtherLink = css`
  font-size: 0.75rem;
  color: var(--color4);
  max-width: calc(50% - 2rem - 15px);
  line-height: 24px;
`;

const BadgeOutlineDark = css`
  border: 1px solid var(--bs-gray-700);
  color: var(--bs-gray-700) !important;
`;

const TagBadge = css`
  height: 20px;
`;

const MiniBadge = css`
  font-size: 0.65rem !important;
`;

const Location = css`
  font-size: 0.8rem;
`;

const Link = css`
  position: relative;
  color: inherit;
  height: 24px;
  line-height: 22px;
  width: auto;

  &:hover {
    color: var(--color1);
  }

  svg {
    position: relative;
    height: 18px;
    width: auto;
    margin-top: -4px;
  }
`;

const Fieldset = css`
  padding: 1.5rem 1.75rem;
  margin-top: 2rem;

  & + & {
    margin-top: 3rem;
  }
`;

const FieldsetTitle = css`
  font-size: 0.8rem;
  line-height: 0.8rem;
  color: var(--color4);
  top: -0.35rem;
  left: 1rem;
`;

const TableLayout = css`
  table-layout: fixed;
`;

const Thead = css`
  font-size: 0.8rem !important;

  th {
    color: var(--bs-gray-600);
  }
`;

const TableContent = css`
  td {
    font-size: 0.8rem !important;
    line-height: 2;
  }
`;

const TableLink = css`
  font-size: 0.8rem !important;
`;

const AuditsCol = css`
  width: 120px;
`;

const AuditsColMd = css`
  width: 200px;
`;

const Summary = css`
  .summaryBlock + .summaryBlock {
    margin-top: 1.15rem;
  }
`;

const SummaryContent = css`
  font-size: 0.8rem !important;
`;

const SummaryBadge = css`
  background-color: var(--color-stats-1);
`;

const getPackageManagerIcon = (url: string): SVGIconKind => {
  const icon = SVGIconKind.PackageManager;
  const pkgManagerUrl = new URL(url);
  const pkgManagerHostname = pkgManagerUrl.hostname;

  if (pkgManagerHostname.includes('npmjs.com')) {
    return SVGIconKind.NPM;
  } else if (pkgManagerHostname.includes('pypi.org')) {
    return SVGIconKind.PyPi;
  } else if (pkgManagerHostname.includes('crates.io')) {
    return SVGIconKind.Rust;
  } else if (pkgManagerHostname.includes('cpan.org')) {
    return SVGIconKind.Perl;
  } else if (pkgManagerHostname.includes('rubygems.org')) {
    return SVGIconKind.RubyGems;
  } else if (pkgManagerHostname.includes('maven.apache.org')) {
    return SVGIconKind.MavenApache;
  } else if (pkgManagerHostname.includes('packagist.org')) {
    return SVGIconKind.Packagist;
  } else if (pkgManagerHostname.includes('cocoapods.org')) {
    return SVGIconKind.Cocoapods;
  } else if (pkgManagerHostname.includes('nuget.org')) {
    return SVGIconKind.Nuget;
  } else if (pkgManagerHostname.includes('pub.dev')) {
    return SVGIconKind.Flutter;
  } else if (pkgManagerHostname.includes('hex.pm')) {
    return SVGIconKind.Erlang;
  }

  return icon;
};

export const ItemModalContent = (props: Props) => {
  const itemInfo = () => props.item;
  const [description, setDescription] = createSignal<string>();
  const [primaryRepo, setPrimaryRepo] = createSignal<Repository>();
  const distribution_version = () => window.baseDS?.distribution_version || undefined;
  createEffect(
    on(itemInfo, () => {
      if (!isUndefined(itemInfo()) && !isNull(itemInfo())) {
        let primaryRepoTmp: Repository | undefined;
        setDescription(getItemDescription(itemInfo()!));
        if (!isUndefined(itemInfo()!.repositories)) {
          itemInfo()!.repositories!.forEach((repo: Repository) => {
            if (repo.primary) {
              primaryRepoTmp = repo;
            }
          });

          if (primaryRepoTmp) {
            setPrimaryRepo(primaryRepoTmp);
          }
        }
      } else {
        setPrimaryRepo(undefined);
        setDescription(undefined);
        if (props.onClose) {
          props.onClose();
        }
      }
    })
  );

  const getLinkedInUrl = (): string | null => {
    if (itemInfo()) {
      if (itemInfo()!.linkedin_url) {
        return itemInfo()!.linkedin_url!;
      } else {
        if (itemInfo()!.crunchbase_data && itemInfo()!.crunchbase_data!.linkedin_url) {
          return itemInfo()!.crunchbase_data!.linkedin_url!;
        }
      }
    }
    return null;
  };

  return (
    <>
      <Show when={!isUndefined(props.basePath)}>
        <ItemDropdown itemId={itemInfo()!.id} foundation={props.foundation} basePath={props.basePath!} />
      </Show>
      <div class="d-flex flex-column p-3">
        <div class="d-flex flex-row align-items-center">
          <div class={`d-flex align-items-center justify-content-center ${LogoWrapper}`}>
            {/* <Image class={`m-auto ${Logo}`} logo={itemInfo()!.logo} /> */}
            <ImageName bigCard={true} name={itemInfo()!.name} class={`m-auto ${Logo}`} logo={itemInfo()!.logo} />
          </div>

          <div class={`d-flex flex-column justify-content-between ms-3 ${ItemInfo}`}>
            <div class="d-flex flex-row align-items-center me-5">
              <div class={`fw-semibold text-truncate pe-2 ${Title}`}>{itemInfo()!.name}</div>
              <div class="d-flex flex-row align-items-center ms-2">
                <Show when={!isUndefined(itemInfo()!.organization)}>
                  <FoundationBadge foundation={itemInfo()!.organization!} />
                </Show>
                <Show when={!isUndefined(itemInfo()!.maturity)}>
                  <MaturityBadge
                    level={itemInfo()!.maturity!}
                    showTable={itemInfo()!.maturity === 'distribution'}
                    versions={itemInfo()!.versions || []}
                    class="mx-2"
                  />
                  <Show when={!isUndefined(itemInfo()!.tag)}>
                    <div class={`badge text-uppercase rounded-0 me-2 ${BadgeOutlineDark} ${TagBadge}`}>
                      TAG {formatTAGName(itemInfo()!.tag!)}
                    </div>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.accepted_at)}>
                    <div
                      title={`Accepted at ${itemInfo()!.accepted_at}`}
                      class="d-flex flex-row align-items-center accepted-date me-3"
                    >
                      <SVGIcon kind={SVGIconKind.Calendar} class="me-1 text-muted" />
                      <div>
                        <small>{itemInfo()!.accepted_at!.split('-')[0]}</small>
                      </div>
                    </div>
                  </Show>
                </Show>
                <Show when={!isUndefined(itemInfo()!.joined_at) && isUndefined(itemInfo()!.accepted_at)}>
                  <div
                    title={`Joined at ${itemInfo()!.joined_at}`}
                    class="d-flex flex-row align-items-center accepted-date me-3 mt-1"
                  >
                    <SVGIcon kind={SVGIconKind.Calendar} class="me-1 text-muted" />
                    <div>
                      <small>{itemInfo()!.joined_at!.split('-')[0]}</small>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
            {/* <Show when={!isUndefined(itemInfo()!.crunchbase_data) && itemInfo()!.crunchbase_data!.name}>
              <div class={`text-muted text-truncate ${Name}`}>
                <small>{itemInfo()!.crunchbase_data!.name}</small>
              </div>
            </Show> */}
            <div class="d-flex flex-row align-items-center mb-1">
              <div class={`d-none d-xl-flex badge rounded-0 ${BadgeOutlineDark}`}>{itemInfo()!.category}</div>
              <div class={`badge ms-0 ms-xl-2 rounded-0 ${BadgeOutlineDark}`}>{itemInfo()!.subcategory}</div>
              <Show when={!isUndefined(itemInfo()!.enduser) && itemInfo()!.enduser}>
                <div class={`badge ms-0 ms-xl-2 me-3 rounded-0 ${BadgeOutlineDark}`}>End user</div>
              </Show>

              <div class="ms-auto">
                <div class="d-flex flex-row align-items-center">
                  <Show when={!isUndefined(props.item!.website)}>
                    <ExternalLink title="Website" class={`ms-3 ${Link}`} href={props.item!.website!}>
                      <SVGIcon kind={SVGIconKind.World} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(primaryRepo())}>
                    <ExternalLink title="Repository" class={`ms-3 ${Link}`} href={primaryRepo()!.url}>
                      {primaryRepo()!.url.includes('gitee.com') ? (
                        <SVGIcon kind={SVGIconKind.Gitee} />
                      ) : (
                        <SVGIcon kind={SVGIconKind.GitHubCircle} />
                      )}
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.devstats_url)}>
                    <ExternalLink title="Devstats" class={`ms-3 ${Link}`} href={itemInfo()!.devstats_url!}>
                      <SVGIcon kind={SVGIconKind.Stats} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.twitter_url)}>
                    <ExternalLink title="X (Twitter)" class={`ms-3 ${Link}`} href={itemInfo()!.twitter_url!}>
                      <SVGIcon kind={SVGIconKind.Twitter} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.youtube_url)}>
                    <ExternalLink title="Youtube" class={`ms-3 ${Link}`} href={itemInfo()!.youtube_url!}>
                      <SVGIcon kind={SVGIconKind.Youtube} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isNull(getLinkedInUrl())}>
                    <ExternalLink title="LinkedIn" class={`ms-3 ${Link}`} href={getLinkedInUrl()!}>
                      <SVGIcon kind={SVGIconKind.LinkedIn} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.slack_url)}>
                    <ExternalLink title="Slack" class={`ms-3 ${Link}`} href={itemInfo()!.slack_url!}>
                      <SVGIcon kind={SVGIconKind.Slack} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.discord_url)}>
                    <ExternalLink title="Discord" class={`ms-3 ${Link}`} href={itemInfo()!.discord_url!}>
                      <SVGIcon kind={SVGIconKind.Discord} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.docker_url)}>
                    <ExternalLink title="Docker" class={`ms-3 ${Link}`} href={itemInfo()!.docker_url!}>
                      <SVGIcon kind={SVGIconKind.Docker} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.stack_overflow_url)}>
                    <ExternalLink title="Stack overflow" class={`ms-3 ${Link}`} href={itemInfo()!.stack_overflow_url!}>
                      <SVGIcon kind={SVGIconKind.StackOverflow} />
                    </ExternalLink>
                  </Show>

                  <Show when={isUndefined(itemInfo()!.maturity) && !isUndefined(itemInfo()!.crunchbase_url)}>
                    <ExternalLink title="Crunchbase" class={`ms-3 ${Link}`} href={itemInfo()!.crunchbase_url!}>
                      <SVGIcon kind={SVGIconKind.Crunchbase} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.blog_url)}>
                    <ExternalLink title="Blog" class={`ms-3 ${Link}`} href={itemInfo()!.blog_url!}>
                      <SVGIcon kind={SVGIconKind.Blog} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.mailing_list_url)}>
                    <ExternalLink title="Mailing list" class={`ms-3 ${Link}`} href={itemInfo()!.mailing_list_url!}>
                      <SVGIcon kind={SVGIconKind.MailingList} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.openssf_best_practices_url)}>
                    <ExternalLink
                      title="OpenSSF best practices"
                      class={`ms-3 ${Link}`}
                      href={itemInfo()!.openssf_best_practices_url!}
                    >
                      <SVGIcon kind={SVGIconKind.OpenssfBestPractices} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.artwork_url)}>
                    <ExternalLink title="Artwork" class={`ms-3 ${Link}`} href={itemInfo()!.artwork_url!}>
                      <SVGIcon kind={SVGIconKind.Artwork} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.github_discussions_url)}>
                    <ExternalLink
                      title="Github discussions"
                      class={`ms-3 ${Link}`}
                      href={itemInfo()!.github_discussions_url!}
                    >
                      <SVGIcon kind={SVGIconKind.Discussions} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.documentation_url)}>
                    <ExternalLink title="Documenation" class={`ms-3 ${Link}`} href={itemInfo()!.documentation_url!}>
                      <SVGIcon kind={SVGIconKind.Book} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.package_manager_url)}>
                    <ExternalLink
                      title="Package manager"
                      class={`ms-3 ${Link}`}
                      href={itemInfo()!.package_manager_url!}
                    >
                      <SVGIcon kind={getPackageManagerIcon(itemInfo()!.package_manager_url!)} />
                    </ExternalLink>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Description */}
        <div class={`mt-4 text-muted ${Description}`}>{description()}</div>

        {/* Other links */}
        <Show when={!isUndefined(itemInfo()!.other_links)}>
          <div class="d-flex flex-row flex-wrap align-items-center mt-2">
            <For each={itemInfo()!.other_links}>
              {(link, index) => {
                return (
                  <>
                    <ExternalLink
                      href={link.url}
                      class={`fw-semibold text-nowrap d-inline-block text-truncate text-uppercase ${OtherLink}`}
                    >
                      {cutString(link.name, 30)}
                    </ExternalLink>
                    <Show when={index() !== itemInfo()!.other_links!.length - 1}>
                      <div class="mx-2">·</div>
                    </Show>
                  </>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Additional categories */}
        <Show when={!isUndefined(itemInfo()!.additional_categories) && !isEmpty(itemInfo()!.additional_categories)}>
          <div class={`fw-bold text-uppercase mt-4 mb-3 ${TitleInSection}`}>Additional categories</div>
          <div class="d-flex flex-row flex-wrap align-items-center mb-2">
            <For each={itemInfo()!.additional_categories}>
              {(additional: AdditionalCategory) => {
                return (
                  <div class={`badge rounded-0 me-2 mb-2 ${BadgeOutlineDark}`}>
                    {additional.category} / {additional.subcategory}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
        <Show when={!isNull(props.parentInfo)}>
          {/* Parent project */}
          <ParentProject
            parentInfo={props.parentInfo!}
            projectName={itemInfo()!.name}
            class={Fieldset}
            mobileVersion={false}
            foundation={props.foundation}
          />
        </Show>
        {/* Maturity */}
        <MaturitySection item={itemInfo()!} class={Fieldset} />
        {/* 发行版 */}
        <Show when={!isUndefined(itemInfo()!.versions) && itemInfo()!.maturity === 'distribution'}>
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>发行版</div>
            <div class={`fw-semibold text-truncate fs-6 mx-2`}>当前发行版：{distribution_version()}</div>
            <MyTable
              tableData={itemInfo()!.versions}
              tableThead={['发行版版本', '软件版本']}
              tableKey={['distribution_version', 'software_version']}
            />
          </div>
        </Show>
        {/* Repositories */}
        <RepositoriesSection
          repositories={itemInfo()!.repositories}
          class={`border ${Fieldset}`}
          titleClass={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}
        />

        {/* Security audits */}
        <Show when={!isUndefined(itemInfo()!.audits) && !isEmpty(itemInfo()!.audits)}>
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>Security audits</div>
            <div class="w-100">
              <table class={`table table-sm table-striped table-bordered mt-3 ${TableLayout}`}>
                <thead class={`text-uppercase text-muted ${Thead}`}>
                  <tr>
                    <th class={`text-center ${AuditsCol}`} scope="col">
                      Date
                    </th>
                    <th class={`text-center ${AuditsCol}`} scope="col">
                      Type
                    </th>
                    <th class={`text-center ${AuditsColMd}`} scope="col">
                      Vendor
                    </th>
                    <th class="text-center" scope="col">
                      Url
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={sortBy(itemInfo()!.audits, 'date').reverse()}>
                    {(audit: SecurityAudit) => {
                      return (
                        <tr class={TableContent}>
                          <td class="px-3 text-center text-nowrap">{audit.date}</td>
                          <td class="px-3 text-center text-uppercase">{audit.type}</td>
                          <td class="px-3 text-center text-nowrap">
                            <div class="w-100 text-truncate">{audit.vendor}</div>
                          </td>
                          <td class="px-3">
                            <div class="w-100">
                              <ExternalLink
                                class={`text-muted text-truncate d-block text-decoration-underline ${TableLink}`}
                                href={audit.url}
                              >
                                {audit.url}
                              </ExternalLink>
                            </div>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
        {/* Organization */}
        <Show when={!isUndefined(itemInfo()!.crunchbase_data)}>
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>Organization</div>
            <div class="d-flex flex-row align-items-center">
              <div class={`fw-semibold text-truncate fs-6`}>{itemInfo()!.crunchbase_data!.name}</div>

              <Show when={!isUndefined(itemInfo()!.crunchbase_data!.kind)}>
                <div class={`ms-3 badge rounded-0 text-dark text-uppercase ${BadgeOutlineDark} ${MiniBadge}`}>
                  {itemInfo()!.crunchbase_data!.kind}
                </div>
              </Show>
              <Show when={!isUndefined(itemInfo()!.crunchbase_data!.company_type)}>
                <div class={`ms-3 badge rounded-0 text-dark text-uppercase ${BadgeOutlineDark} ${MiniBadge}`}>
                  {formatProfitLabel(itemInfo()!.crunchbase_data!.company_type!)}
                </div>
              </Show>
            </div>
            <Show
              when={
                !isUndefined(itemInfo()!.crunchbase_data!.city) ||
                !isUndefined(itemInfo()!.crunchbase_data!.region) ||
                !isUndefined(itemInfo()!.crunchbase_data!.country)
              }
            >
              <div class={`text-muted pt-1 ${Location}`}>
                <Show when={!isUndefined(itemInfo()!.crunchbase_data!.city)}>{itemInfo()!.crunchbase_data!.city}</Show>
                <Show
                  when={
                    !isUndefined(itemInfo()!.crunchbase_data!.city) &&
                    (!isUndefined(itemInfo()!.crunchbase_data!.region) ||
                      !isUndefined(itemInfo()!.crunchbase_data!.country))
                  }
                >
                  <>, </>
                </Show>

                <Show when={!isUndefined(itemInfo()!.crunchbase_data!.region)}>
                  {itemInfo()!.crunchbase_data!.region}
                </Show>
                <Show
                  when={
                    !isUndefined(itemInfo()!.crunchbase_data!.region) &&
                    !isUndefined(itemInfo()!.crunchbase_data!.country)
                  }
                >
                  <>, </>
                </Show>

                <Show when={!isUndefined(itemInfo()!.crunchbase_data!.country)}>
                  {itemInfo()!.crunchbase_data!.country}
                </Show>
              </div>
            </Show>
            <div class="mt-3">
              <small class="text-muted">{itemInfo()!.crunchbase_data!.description}</small>
            </div>
            <div class="row g-4 my-0 mb-2">
              <Box
                value={
                  !isUndefined(itemInfo()!.crunchbase_data!.funding)
                    ? prettifyNumber(itemInfo()!.crunchbase_data!.funding!)
                    : '-'
                }
                legend="Funding"
                description="Funding"
              />

              <Box
                value={
                  <Switch>
                    <Match
                      when={
                        isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                        isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                      }
                    >
                      -
                    </Match>
                    <Match
                      when={
                        !isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                        !isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                      }
                    >
                      {prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_min!)} -{' '}
                      {prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_max!)}
                    </Match>
                    <Match
                      when={
                        !isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                        isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                      }
                    >
                      {'> '}
                      {prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_min!)}
                    </Match>
                    <Match
                      when={
                        isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                        !isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                      }
                    >
                      {'< '}
                      {prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_max!)}
                    </Match>
                  </Switch>
                }
                legend="Employees"
                description="Employees number"
              />

              <Box
                value={itemInfo()!.crunchbase_data!.stock_exchange! || '-'}
                legend="Stock exchange"
                description="Stock exchange"
              />

              <Box value={itemInfo()!.crunchbase_data!.ticker || '-'} legend="Ticker" description="Ticker" />
            </div>

            {/* Funding rounds */}
            <Show
              when={
                !isUndefined(itemInfo()!.crunchbase_data!.funding_rounds) &&
                !isEmpty(itemInfo()!.crunchbase_data!.funding_rounds!)
              }
            >
              <FundingRoundsTable
                rounds={itemInfo()!.crunchbase_data!.funding_rounds!}
                titleClassName={TitleInSection}
              />
            </Show>

            {/* Acquisitions */}
            <Show
              when={
                !isUndefined(itemInfo()!.crunchbase_data!.acquisitions) &&
                !isEmpty(itemInfo()!.crunchbase_data!.acquisitions!)
              }
            >
              <AcquisitionsTable
                acquisitions={itemInfo()!.crunchbase_data!.acquisitions!}
                titleClassName={TitleInSection}
              />
            </Show>
          </div>
        </Show>
        {/* Summary */}
        <Show when={!isUndefined(itemInfo()!.summary)}>
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>Summary</div>
            <div class={`my-2 ${Summary}`}>
              <Show when={!isUndefined(itemInfo()!.summary!.intro_url) && !isEmpty(itemInfo()!.summary!.intro_url)}>
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Introduction</div>
                  <div class={`mt-2 ${SummaryContent}`}>{itemInfo()!.summary!.intro_url!}</div>
                </div>
              </Show>

              <Show when={!isUndefined(itemInfo()!.summary!.use_case) && !isEmpty(itemInfo()!.summary!.use_case)}>
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Use case</div>
                  <div class={`mt-2 ${SummaryContent}`}>
                    <CollapsableText text={itemInfo()!.summary!.use_case!} />
                  </div>
                </div>
              </Show>

              <Show
                when={
                  !isUndefined(itemInfo()!.summary!.business_use_case) &&
                  !isEmpty(itemInfo()!.summary!.business_use_case)
                }
              >
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Business use case</div>
                  <div class={`mt-2 ${SummaryContent}`}>
                    <CollapsableText text={itemInfo()!.summary!.business_use_case!} />
                  </div>
                </div>
              </Show>

              <Show
                when={
                  (!isUndefined(itemInfo()!.summary!.integrations) || !isUndefined(itemInfo()!.summary!.integration)) &&
                  !isEmpty(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)
                }
              >
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Integrations</div>
                  <div class={`mt-2 ${SummaryContent}`}>
                    <CollapsableText text={(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)!} />
                  </div>
                </div>
              </Show>

              <Show
                when={!isUndefined(itemInfo()!.summary!.release_rate) && !isEmpty(itemInfo()!.summary!.release_rate)}
              >
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Release rate</div>
                  <div class={`mt-2 ${SummaryContent}`}>
                    <CollapsableText text={itemInfo()!.summary!.release_rate!} />
                  </div>
                </div>
              </Show>

              <Show
                when={!isUndefined(itemInfo()!.summary!.personas) && !isEmpty(compact(itemInfo()!.summary!.personas!))}
              >
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Personas</div>
                  <For each={compact(itemInfo()!.summary!.personas!)}>
                    {(persona) => {
                      return <Badge text={persona} class={`me-2 mt-2 ${SummaryBadge}`} />;
                    }}
                  </For>
                </div>
              </Show>

              <Show when={!isUndefined(itemInfo()!.summary!.tags) && !isEmpty(compact(itemInfo()!.summary!.tags!))}>
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Tags</div>
                  <For each={compact(itemInfo()!.summary!.tags!)}>
                    {(tag) => {
                      return <Badge text={tag} class={`me-2 mt-2 ${SummaryBadge}`} />;
                    }}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>
        {/* <div>{itemInfo()!.summary!.intro_url!}</div> */}
        {/* Oss-compass */}
        <Show
          when={
            !isUndefined(itemInfo()!.maturity) && ['incubating', 'graduated'].includes(itemInfo()!.maturity as string)
          }
        >
          <div class={`position-relative d-none border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>开源社区评估报告</div>
            <div class="my-2 d-flex justify-content-center w-100 align-items-center">
              <ExternalLink
                // href={`https://compass.gitee.com/oh#graduationReportPage?projectId=gd230s24`}
                href={`https://compass.gitee.com/oh#${itemInfo()!.maturity!.toLowerCase() === 'graduated' ? 'graduationReportPage' : 'reportDetailPage'}?projectId=${primaryRepo()?.url}`}
              >
                <Image
                  // name={`CLOMonitor report summary for ${itemInfo()!.name}`}
                  logo={`https://compass.gitee.com/chart/tpc?report_type=${itemInfo()!.maturity!.toLowerCase() === 'graduated' ? 'graduation' : 'incubating'}&code_url=${primaryRepo()!.url!}`}
                />
              </ExternalLink>
            </div>
          </div>
        </Show>
        {/* <Show when={!isUndefined(itemInfo()!.clomonitor_name) && !isUndefined(itemInfo()!.clomonitor_report_summary)}>
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>OSS Compass report summary</div>
            <div class="my-2 d-flex justify-content-center w-100 align-items-center">
              <ExternalLink
                href={`https://clomonitor.io/projects/${props.foundation.toLowerCase()}/${itemInfo()!
                  .clomonitor_name!}`}
              >
                <Image
                  name={`CLOMonitor report summary for ${itemInfo()!.name}`}
                  logo={itemInfo()!.clomonitor_report_summary!}
                />
              </ExternalLink>
            </div>
          </div>
        </Show> */}
        <div class={`pt-2 ${compass}`}>
          <div>Powered by </div>
          <ExternalLink href={'https://oss-compass.org'}>
            {/* <SVGIcon kind={SVGIconKind.OssCompass} class={`me-1 ${compassLogo}`} /> */}
            <div class={`me-1 ${compassLogo}`}>
              <svg
                viewBox="0 0 231 42"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
              >
                {/* <title>logo</title> */}
                <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g id="HOME-1" transform="translate(-109.000000, -43.000000)" fill="#000000">
                    <g id="nav" transform="translate(103.000000, 35.000000)">
                      <g id="logo" transform="translate(7.000000, 8.000000)">
                        <g id="Group-Copy">
                          <path
                            d="M29.8498971,36.5268361 C33.1992683,36.5268361 36.3026737,35.4812939 38.8470607,33.7010143 L42.7918255,37.6182412 C39.3335785,40.2772583 35.0226484,41.8956422 30.3354098,42.0004391 L29.3643843,42.0004391 C24.6666553,41.8954076 20.3469212,40.2700066 16.8847621,37.6003724 L20.8287182,33.6841776 C23.3775816,35.4747001 26.4899809,36.5268361 29.8498971,36.5268361 Z M46.675,8.022 L59.7096345,21.0561727 L46.729,34.036 L42.813,30.148 L51.9335813,21.0285955 L42.787,11.882 L46.675,8.022 Z M13.003,8.042 L16.892,11.902 L7.76621284,21.0285955 L16.866,30.128 L12.95,34.015 L-0.00984043466,21.0561727 L13.003,8.042 Z M29.8498971,0 C34.7249209,0 39.2148013,1.63715417 42.7921867,4.38789798 L38.8466041,8.30452775 C36.3023024,6.52444251 33.1990679,5.47902541 29.8498971,5.47902541 C26.4899503,5.47902541 23.377525,6.53118058 20.8286486,8.32173278 L16.8847216,4.40552028 C20.4658352,1.64414774 24.9644717,0 29.8498971,0 Z"
                            id="Combined-Shape"
                          ></path>
                          <path
                            d="M29.8498971,9.3143432 C36.3520171,9.3143432 41.6230269,14.5475021 41.6230269,21.0029307 C41.6230269,27.4583594 36.3520171,32.6915183 29.8498971,32.6915183 C23.347777,32.6915183 18.0767672,27.4583594 18.0767672,21.0029307 C18.0767672,14.5475021 23.347777,9.3143432 29.8498971,9.3143432 Z M29.7376526,10.0381992 L25.4706701,20.6290529 C25.3757498,20.8646496 25.3757498,21.1278504 25.4706701,21.3634471 L25.4706701,21.3634471 L29.7376526,31.9543008 L34.0046351,21.3634471 C34.0995554,21.1278504 34.0995554,20.8646496 34.0046351,20.6290529 L34.0046351,20.6290529 L29.7376526,10.0381992 Z M29.7376526,20.022201 C30.2860098,20.022201 30.7305412,20.4582976 30.7305412,20.99625 C30.7305412,21.5342024 30.2860098,21.970299 29.7376526,21.970299 C29.1892953,21.970299 28.7447639,21.5342024 28.7447639,20.99625 C28.7447639,20.4582976 29.1892953,20.022201 29.7376526,20.022201 Z"
                            id="Combined-Shape"
                          ></path>
                        </g>
                        <g id="OSS-Compass" transform="translate(76.000000, 11.000000)" fill-rule="nonzero">
                          <path
                            d="M13.3305853,11.1637701 C13.3305853,13.6446078 12.7444628,15.5708556 11.5722176,16.9425134 C10.3999725,18.3141711 8.77279472,19 6.69068425,19 C4.61703765,19 2.98774389,18.3205214 1.80280297,16.9615642 C0.61786205,15.602607 0.0169277274,13.6996435 0,11.2526738 L0,8.09024064 C0,5.55013369 0.588238527,3.56673351 1.76471558,2.14004011 C2.94119264,0.713346702 4.57471833,0 6.66529266,0 C8.72201154,0 10.3428414,0.700646168 11.5277824,2.1019385 C12.7127233,3.50323084 13.3136576,5.46969697 13.3305853,8.0013369 L13.3305853,11.1637701 Z M9.58532564,8.06483957 C9.58532564,6.39683601 9.34833746,5.15641711 8.87436109,4.34358289 C8.40038472,3.53074866 7.66402858,3.12433155 6.66529266,3.12433155 C5.67502061,3.12433155 4.9428964,3.51593137 4.46892003,4.29913102 C3.99494367,5.08233066 3.74949162,6.27406417 3.73256389,7.87433155 L3.73256389,11.1637701 C3.73256389,12.7809715 3.97378401,13.972705 4.45622424,14.7389706 C4.93866447,15.5052362 5.68348447,15.888369 6.69068425,15.888369 C7.66402858,15.888369 8.38768893,15.5137032 8.86166529,14.7643717 C9.33564166,14.0150401 9.57686178,12.8529412 9.58532564,11.2780749 L9.58532564,8.06483957 Z"
                            id="Shape"
                          ></path>
                          <path
                            d="M23.8173124,13.894385 C23.8173124,13.14082 23.6247595,12.5714127 23.2396538,12.1861631 C22.854548,11.8009135 22.1541632,11.4008467 21.1384996,10.9859626 C19.2849134,10.2831996 17.9518549,9.45978164 17.139324,8.51570856 C16.3267931,7.57163547 15.9205276,6.45610517 15.9205276,5.16911765 C15.9205276,3.61118538 16.4727947,2.36018271 17.5773289,1.41610963 C18.6818631,0.472036542 20.0847486,0 21.7859852,0 C22.9201429,0 23.9315746,0.239193405 24.8202803,0.717580214 C25.708986,1.19596702 26.392443,1.87121212 26.8706513,2.74331551 C27.3488596,3.61541889 27.5879637,4.60606061 27.5879637,5.71524064 L23.8680956,5.71524064 C23.8680956,4.85160428 23.6840066,4.19329323 23.3158285,3.74030749 C22.9476505,3.28732175 22.416543,3.06082888 21.7225062,3.06082888 C21.0707887,3.06082888 20.5629569,3.25345365 20.1990107,3.63870321 C19.8350646,4.02395276 19.6530915,4.54255793 19.6530915,5.19451872 C19.6530915,5.70254011 19.8562242,6.16187611 20.2624897,6.57252674 C20.6687552,6.98317736 21.3881836,7.40864528 22.4207749,7.84893048 C24.2235779,8.50089127 25.5333608,9.30102496 26.3501237,10.2493316 C27.1668865,11.1976381 27.5752679,12.4041889 27.5752679,13.868984 C27.5752679,15.4777184 27.0632042,16.7350713 26.0390767,17.6410428 C25.0149492,18.5470143 23.6226436,19 21.8621599,19 C20.6687552,19 19.5811487,18.7544563 18.5993405,18.263369 C17.6175323,17.7722816 16.8494367,17.0695187 16.2950536,16.1550802 C15.7406705,15.2406417 15.463479,14.1610963 15.463479,12.9164439 L19.2087387,12.9164439 C19.2087387,13.9832888 19.4161033,14.7580214 19.8308326,15.2406417 C20.245562,15.723262 20.9226711,15.9645722 21.8621599,15.9645722 C23.1655949,15.9645722 23.8173124,15.2745098 23.8173124,13.894385 Z"
                            id="Path"
                          ></path>
                          <path
                            d="M37.8588623,13.894385 C37.8588623,13.14082 37.6663094,12.5714127 37.2812036,12.1861631 C36.8960978,11.8009135 36.1957131,11.4008467 35.1800495,10.9859626 C33.3264633,10.2831996 31.9934048,9.45978164 31.1808739,8.51570856 C30.368343,7.57163547 29.9620775,6.45610517 29.9620775,5.16911765 C29.9620775,3.61118538 30.5143446,2.36018271 31.6188788,1.41610963 C32.723413,0.472036542 34.1262984,0 35.827535,0 C36.9616928,0 37.9731245,0.239193405 38.8618302,0.717580214 C39.7505359,1.19596702 40.4339929,1.87121212 40.9122012,2.74331551 C41.3904095,3.61541889 41.6295136,4.60606061 41.6295136,5.71524064 L37.9096455,5.71524064 C37.9096455,4.85160428 37.7255565,4.19329323 37.3573784,3.74030749 C36.9892003,3.28732175 36.4580929,3.06082888 35.7640561,3.06082888 C35.1123386,3.06082888 34.6045067,3.25345365 34.2405606,3.63870321 C33.8766145,4.02395276 33.6946414,4.54255793 33.6946414,5.19451872 C33.6946414,5.70254011 33.8977741,6.16187611 34.3040396,6.57252674 C34.710305,6.98317736 35.4297334,7.40864528 36.4623248,7.84893048 C38.2651278,8.50089127 39.5749107,9.30102496 40.3916735,10.2493316 C41.2084364,11.1976381 41.6168178,12.4041889 41.6168178,13.868984 C41.6168178,15.4777184 41.1047541,16.7350713 40.0806265,17.6410428 C39.056499,18.5470143 37.6641935,19 35.9037098,19 C34.710305,19 33.6226985,18.7544563 32.6408904,18.263369 C31.6590822,17.7722816 30.8909865,17.0695187 30.3366035,16.1550802 C29.7822204,15.2406417 29.5050289,14.1610963 29.5050289,12.9164439 L33.2502885,12.9164439 C33.2502885,13.9832888 33.4576532,14.7580214 33.8723825,15.2406417 C34.2871118,15.723262 34.9642209,15.9645722 35.9037098,15.9645722 C37.2071448,15.9645722 37.8588623,15.2745098 37.8588623,13.894385 Z"
                            id="Path"
                          ></path>
                          <path
                            d="M62.6156636,12.5862299 C62.5225611,14.6945187 61.9300907,16.2905526 60.8382523,17.3743316 C59.7464138,18.4581105 58.2059907,19 56.2169827,19 C54.1264084,19 52.5246221,18.3120544 51.4116241,16.9361631 C50.298626,15.5602718 49.742127,13.5980392 49.742127,11.0494652 L49.742127,7.93783422 C49.742127,5.39772727 50.3176697,3.43972816 51.4687552,2.0638369 C52.6198406,0.687945633 54.2195109,0 56.2677659,0 C58.2821654,0 59.8120088,0.563057041 60.857296,1.68917112 C61.9025831,2.8152852 62.4971696,4.43248663 62.6410552,6.5407754 L58.8957955,6.5407754 C58.8619401,5.23685383 58.6609233,4.33723262 58.2927453,3.84191176 C57.9245672,3.34659091 57.2495741,3.09893048 56.2677659,3.09893048 C55.26903,3.09893048 54.5622973,3.44819519 54.147568,4.1467246 C53.7328387,4.84525401 53.5127782,5.99465241 53.4873866,7.59491979 L53.4873866,11.0875668 C53.4873866,12.9249109 53.6926353,14.1864973 54.1031327,14.8723262 C54.5136301,15.5581551 55.2182468,15.9010695 56.2169827,15.9010695 C57.1987909,15.9010695 57.8759,15.6618761 58.24831,15.1834893 C58.62072,14.7051025 58.8323166,13.8393494 58.8830998,12.5862299 L62.6156636,12.5862299 Z"
                            id="Path"
                          ></path>
                          <path
                            d="M77.9267931,11.1637701 C77.9267931,13.6446078 77.3406705,15.5708556 76.1684254,16.9425134 C74.9961803,18.3141711 73.3690025,19 71.286892,19 C69.2132454,19 67.5839516,18.3205214 66.3990107,16.9615642 C65.2140698,15.602607 64.6131355,13.6996435 64.5962077,11.2526738 L64.5962077,8.09024064 C64.5962077,5.55013369 65.1844463,3.56673351 66.3609233,2.14004011 C67.5374004,0.713346702 69.1709261,0 71.2615004,0 C73.3182193,0 74.9390492,0.700646168 76.1239901,2.1019385 C77.308931,3.50323084 77.9098653,5.46969697 77.9267931,8.0013369 L77.9267931,11.1637701 Z M74.1815334,8.06483957 C74.1815334,6.39683601 73.9445452,5.15641711 73.4705688,4.34358289 C72.9965925,3.53074866 72.2602363,3.12433155 71.2615004,3.12433155 C70.2712284,3.12433155 69.5391041,3.51593137 69.0651278,4.29913102 C68.5911514,5.08233066 68.3456994,6.27406417 68.3287716,7.87433155 L68.3287716,11.1637701 C68.3287716,12.7809715 68.5699918,13.972705 69.052432,14.7389706 C69.5348722,15.5052362 70.2796922,15.888369 71.286892,15.888369 C72.2602363,15.888369 72.9838967,15.5137032 73.457873,14.7643717 C73.9318494,14.0150401 74.1730695,12.8529412 74.1815334,11.2780749 L74.1815334,8.06483957 Z"
                            id="Shape"
                          ></path>
                          <polygon
                            id="Path"
                            points="85.4807914 0.254010695 88.9721352 13.6276738 92.4507832 0.254010695 97.3259687 0.254010695 97.3259687 18.7459893 93.580709 18.7459893 93.580709 13.7419786 93.9234955 6.03275401 90.229019 18.7459893 87.6898599 18.7459893 83.9953833 6.03275401 84.3381698 13.7419786 84.3381698 18.7459893 80.6056059 18.7459893 80.6056059 0.254010695"
                          ></polygon>
                          <path
                            d="M104.05474,12.2433155 L104.05474,18.7459893 L100.322176,18.7459893 L100.322176,0.254010695 L106.619291,0.254010695 C108.447486,0.254010695 109.905386,0.821301248 110.992993,1.95588235 C112.080599,3.09046346 112.624402,4.56372549 112.624402,6.37566845 C112.624402,8.18761141 112.086947,9.61853832 111.012036,10.6684492 C109.937126,11.7183601 108.447486,12.2433155 106.543116,12.2433155 L104.05474,12.2433155 Z M104.05474,9.13168449 L106.619291,9.13168449 C107.330256,9.13168449 107.880407,8.89884135 108.269744,8.43315508 C108.659082,7.96746881 108.853751,7.29010695 108.853751,6.40106952 C108.853751,5.47816399 108.65485,4.74364973 108.257049,4.19752674 C107.859247,3.65140374 107.326024,3.37410873 106.657378,3.36564171 L104.05474,3.36564171 L104.05474,9.13168449 Z"
                            id="Shape"
                          ></path>
                          <path
                            d="M121.676505,14.9612299 L116.585491,14.9612299 L115.595218,18.7459893 L111.646826,18.7459893 L117.423413,0.254010695 L120.838582,0.254010695 L126.653256,18.7459893 L122.666777,18.7459893 L121.676505,14.9612299 Z M117.398021,11.8495989 L120.851278,11.8495989 L119.12465,5.25802139 L117.398021,11.8495989 Z"
                            id="Shape"
                          ></path>
                          <path
                            d="M136.187799,13.894385 C136.187799,13.14082 135.995246,12.5714127 135.61014,12.1861631 C135.225034,11.8009135 134.52465,11.4008467 133.508986,10.9859626 C131.6554,10.2831996 130.322341,9.45978164 129.50981,8.51570856 C128.697279,7.57163547 128.291014,6.45610517 128.291014,5.16911765 C128.291014,3.61118538 128.843281,2.36018271 129.947815,1.41610963 C131.05235,0.472036542 132.455235,0 134.156472,0 C135.290629,0 136.302061,0.239193405 137.190767,0.717580214 C138.079472,1.19596702 138.762929,1.87121212 139.241138,2.74331551 C139.719346,3.61541889 139.95845,4.60606061 139.95845,5.71524064 L136.238582,5.71524064 C136.238582,4.85160428 136.054493,4.19329323 135.686315,3.74030749 C135.318137,3.28732175 134.787029,3.06082888 134.092993,3.06082888 C133.441275,3.06082888 132.933443,3.25345365 132.569497,3.63870321 C132.205551,4.02395276 132.023578,4.54255793 132.023578,5.19451872 C132.023578,5.70254011 132.226711,6.16187611 132.632976,6.57252674 C133.039242,6.98317736 133.75867,7.40864528 134.791261,7.84893048 C136.594064,8.50089127 137.903847,9.30102496 138.72061,10.2493316 C139.537373,11.1976381 139.945754,12.4041889 139.945754,13.868984 C139.945754,15.4777184 139.433691,16.7350713 138.409563,17.6410428 C137.385436,18.5470143 135.99313,19 134.232646,19 C133.039242,19 131.951635,18.7544563 130.969827,18.263369 C129.988019,17.7722816 129.219923,17.0695187 128.66554,16.1550802 C128.111157,15.2406417 127.833965,14.1610963 127.833965,12.9164439 L131.579225,12.9164439 C131.579225,13.9832888 131.78659,14.7580214 132.201319,15.2406417 C132.616048,15.723262 133.293157,15.9645722 134.232646,15.9645722 C135.536081,15.9645722 136.187799,15.2745098 136.187799,13.894385 Z"
                            id="Path"
                          ></path>
                          <path
                            d="M150.229349,13.894385 C150.229349,13.14082 150.036796,12.5714127 149.65169,12.1861631 C149.266584,11.8009135 148.5662,11.4008467 147.550536,10.9859626 C145.69695,10.2831996 144.363891,9.45978164 143.55136,8.51570856 C142.738829,7.57163547 142.332564,6.45610517 142.332564,5.16911765 C142.332564,3.61118538 142.884831,2.36018271 143.989365,1.41610963 C145.093899,0.472036542 146.496785,0 148.198021,0 C149.332179,0 150.343611,0.239193405 151.232317,0.717580214 C152.121022,1.19596702 152.804479,1.87121212 153.282688,2.74331551 C153.760896,3.61541889 154,4.60606061 154,5.71524064 L150.280132,5.71524064 C150.280132,4.85160428 150.096043,4.19329323 149.727865,3.74030749 C149.359687,3.28732175 148.828579,3.06082888 148.134542,3.06082888 C147.482825,3.06082888 146.974993,3.25345365 146.611047,3.63870321 C146.247101,4.02395276 146.065128,4.54255793 146.065128,5.19451872 C146.065128,5.70254011 146.268261,6.16187611 146.674526,6.57252674 C147.080791,6.98317736 147.80022,7.40864528 148.832811,7.84893048 C150.635614,8.50089127 151.945397,9.30102496 152.76216,10.2493316 C153.578923,11.1976381 153.987304,12.4041889 153.987304,13.868984 C153.987304,15.4777184 153.47524,16.7350713 152.451113,17.6410428 C151.426985,18.5470143 150.03468,19 148.274196,19 C147.080791,19 145.993185,18.7544563 145.011377,18.263369 C144.029569,17.7722816 143.261473,17.0695187 142.70709,16.1550802 C142.152707,15.2406417 141.875515,14.1610963 141.875515,12.9164439 L145.620775,12.9164439 C145.620775,13.9832888 145.82814,14.7580214 146.242869,15.2406417 C146.657598,15.723262 147.334707,15.9645722 148.274196,15.9645722 C149.577631,15.9645722 150.229349,15.2745098 150.229349,13.894385 Z"
                            id="Path"
                          ></path>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </svg>
            </div>
          </ExternalLink>
        </div>
      </div>
    </>
  );
};
