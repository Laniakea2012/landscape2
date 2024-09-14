import { css } from 'solid-styled-components';
import { For } from 'solid-js';

interface Props {
  tableThead: string[];
  tableKey: string[];
  tableData: { [key: string]: string }[] | undefined;
}
const TableHeight = css`
  max-height: 200px;
  overflow: auto;
  justify-content: center;
`;
const TableLayout = css`
  table-layout: fixed;
  margin-bottom: 0.5rem !important;
  max-width: 100% !important;
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
  width: 220px;
  overflow: hidden;
  font-weight: 700 !important;
`;
export const MyTable = (props: Props) => {
  return (
    <div class={`w-100 d-flex ${TableHeight}`}>
      <table class={`table table-sm table-striped table-bordered mt-3 ${TableLayout}`}>
        <thead class={`text-uppercase text-muted ${Thead}`}>
          <tr>
            <For each={props.tableThead}>
              {(thead) => {
                return (
                  <th class={`text-center ${AuditsCol}`} scope="col">
                    {thead}
                  </th>
                );
              }}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.tableData}>
            {(audit) => {
              return (
                <tr class={TableContent}>
                  <For each={props.tableKey}>
                    {(tableKey) => {
                      return <td class="px-3 text-center text-nowrap">{audit[tableKey]}</td>;
                    }}
                  </For>
                  {/* <td class="px-3 text-center text-uppercase">{audit.software_version}</td> */}
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    </div>
  );
};
