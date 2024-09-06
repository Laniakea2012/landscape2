import { ExternalLink } from 'common';
import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import styles from './Footer.module.css';

const MiniFooter = () => {
  return (
    <footer role="contentinfo" class={`bg-black text-white mt-4 ${styles.footer}`}>
      <div class="container-fluid">
        <div class="d-flex flex-column flex-sm-row justify-content-between">
          <div class="d-flex flex-column">
            <div>
              <Show when={!isUndefined(window.baseDS.footer) && !isUndefined(window.baseDS.footer!.text)}>
                {/* eslint-disable-next-line solid/no-innerhtml */}
                <div class={`pb-2 ${styles.legend}`} innerHTML={window.baseDS.footer!.text} />
              </Show>
              <div class={styles.legend}>
                OpenAtom OpenHarmony（简称“OpenHarmony”）是由开放原子开源基金会（OpenAtom
                Foundation）孵化及运营的开源项目
                {/* Powered by{' '}
                <ExternalLink class="p-0 fw-semibold text-white text-underline" href="https://oss-compass.org">
                  Oss-Compass
                </ExternalLink>
                . */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MiniFooter;
