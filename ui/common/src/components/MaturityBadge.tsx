import { css } from 'solid-styled-components';
import { Show, createSignal, For } from 'solid-js';
import { useOutsideClick } from '../hooks';

interface Props {
  level: string;
  class?: string;
  showTable?: boolean;
  versions?: { [key: string]: string }[];
}

const Archived = css`
  background-color: var(--bs-orange);
`;
const Dropdown = css`
  left: 0;
  font-size: 0.9rem;
`;
const Fieldset = css`
  padding: 0.5rem 1rem;
  padding-bottom: 0rem;
  margin-top: 1rem;
  & + & {
    margin-top: 1rem;
  }
`;
const FieldsetTitle = css`
  font-size: 0.8rem;
  line-height: 0.8rem;
  color: var(--color4);
  top: -0.35rem;
  left: 1rem;
`;
const TableHeight = css`
  max-height: 200px;
  overflow: auto;
`;
const TableLayout = css`
  table-layout: fixed;
  margin-bottom: 0.5rem !important;
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
const AuditsCol = css`
  width: 120px;
`;
export const MaturityBadge = (props: Props) => {
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  useOutsideClick([ref], ['Versions'], visibleDropdown, () => setVisibleDropdown(false));
  return (
    <div ref={setRef} style="cursor: pointer;" class="position-relative">
      <div
        title={props.level}
        class={`badge rounded-0 text-uppercase ${props.class}`}
        classList={{
          [Archived]: props.level === 'archived',
          'bg-secondary': props.level !== 'archived',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVisibleDropdown(!visibleDropdown());
        }}
      >
        {props.level}
      </div>
      <Show when={props.showTable}>
        <div role="complementary" class={`dropdown-menu rounded-0 ${Dropdown}`} classList={{ show: visibleDropdown() }}>
          <div class={`position-relative  ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>版本详情</div>
            <div class={`w-100 ${TableHeight}`}>
              <table class={`table table-sm table-striped table-bordered mt-3 ${TableLayout}`}>
                <thead class={`text-uppercase text-muted ${Thead}`}>
                  <tr>
                    <th class={`text-center ${AuditsCol}`} scope="col">
                      发行版版本
                    </th>
                    <th class={`text-center ${AuditsCol}`} scope="col">
                      软件版本
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={props.versions}>
                    {(audit) => {
                      return (
                        <tr class={TableContent}>
                          <td class="px-3 text-center text-nowrap">{audit.distribution_version}</td>
                          <td class="px-3 text-center text-uppercase">{audit.software_version}</td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
