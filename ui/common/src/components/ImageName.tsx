import isUndefined from 'lodash/isUndefined';
import { createSignal, onMount, Show } from 'solid-js';
import { REGEX_URL } from '../data/data';
// import styles from './ImageName.module.css';
import { css } from 'solid-styled-components';
import seedrandom from 'seedrandom';

const Wrapper = css`
  justify-content: center;
  align-items: center;
  position: relative;
  // &[data-text]::after {
  //   content: attr(data-text);
  //   color: #48aedd;
  //   position: absolute;
  //   top: 0;
  //   left: 0;
  //   mask-image: linear-gradient(to left, red, rgba(0, 0, 0, 0.5));
  //   -webkit-mask-image: linear-gradient(to left, red, rgba(0, 0, 0, 0.5));
  // }
`;
//#73DD39  #73DDFF
// background: linear-gradient(270deg, #7ac943 0, #41aaef 100%);
// background-clip: text;
// -webkit-background-clip: text;
// -webkit-text-fill-color: transparent;
const WrapperName = css`
  display: flex;
  justify-content: center;
  font-weight: 700;
  overflow: hidden;
`;
const WrapperNameMini = css`
  display: flex;
  justify-content: center;
  font-weight: 600;
  overflow: hidden;
`;
const OpenHarmony = css`
  position: absolute;
  bottom: 0.5rem;
  text-align: center;
  font-family: 'Roboto, sans-serif'; /* 使用不同的字体 */
  font-weight: bold; /* 加粗 */
  font-size: 12px; /* 字体大小 */
  color: rgba(100, 200, 166, 1); /* 突出的颜色 */
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3); /* 添加阴影效果 */
`;
const OpenHarmonyMini = css`
  position: absolute;
  bottom: 0.3rem;
  text-align: center;
  font-family: 'Roboto, sans-serif'; /* 使用不同的字体 */
  font-weight: bold; /* 加粗 */
  font-size: 8px; /* 描述字体大小 */
  line-height: 8px;
  color: rgba(100, 200, 166, 1); /* 突出的颜色 */
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3); /* 添加阴影效果 */
`;
// @ts-ignore
const fontColor1 = css`
  font-family: 'Unlock', cursive;
  color: #ff5722;
  background-color: rgba(221, 160, 221, 0.2);
`;
// @ts-ignore
const fontColor2 = css`
  font-family: 'Kalnia Glaze', sans-serif;
  color: #3f51b5;
  background-color: rgba(240, 161, 69, 0.2);
`;
// @ts-ignore
const fontColor3 = css`
  font-family: 'Montserrat', sans-serif;
  color: #006bcf;
  background-color: rgba(247, 241, 229, 0.5); // 浅米色
`;

// @ts-ignore
const fontColor4 = css`
  font-family: 'Playfair Display', serif;
  color: #e91e63;
  background-color: rgba(255, 182, 193, 0.2); // 浅粉色
`;

// @ts-ignore
const fontColor5 = css`
  font-family: 'Merriweather', serif;
  color: #9c27b0;
  background-color: rgba(221, 160, 221, 0.2); // 浅紫色
`;

// @ts-ignore
const fontColor6 = css`
  font-family: 'Source Code Pro', monospace;
  color: #ff9800;
  background-color: rgba(255, 245, 157, 0.2); // 浅黄色
`;

// @ts-ignore
const fontColor7 = css`
  font-family: 'Protest Guerrilla', sans-serif;
  color: #2196f3;
  background-color: rgba(173, 216, 230, 0.2); // 浅蓝色
`;

// @ts-ignore
const fontColor8 = css`
  font-family: 'Quicksand', sans-serif;
  color: #a25aff;
  background-color: rgba(237, 226, 253, 0.4); // 浅绿
`;

// @ts-ignore
const fontColor9 = css`
  font-family: 'Bebas Neue', sans-serif;
  color: #d7656b;
  background-color: rgba(255, 228, 196, 0.2); // 浅咖啡色
`;

// @ts-ignore
const fontColor10 = css`
  font-family: 'Inconsolata', monospace;
  color: #607d8b;
  background-color: rgba(240, 230, 140, 0.3); // 浅橄榄色
`;

interface Props {
  name?: string;
  logo: string;
  class?: string;
  enableLazyLoad?: boolean;
  width?: string | number;
  height?: string | number;
  ariaHidden?: boolean;
  bigCard: boolean;
}
const getFontSizeByNameLength = (name: string, bigCard: boolean) => {
  const size = bigCard ? 1 : 1.5;
  const length = name.length;
  let fontSize;

  // 根据字符数量设置字体大小
  if (length <= 3) {
    fontSize = 30; // 字符数少于等于3时
  } else if (length <= 5) {
    fontSize = 26; // 字符数在4到5之间
  } else if (length <= 7) {
    fontSize = 22; // 字符数在6到7之间
  } else if (length <= 10) {
    fontSize = 18; // 字符数在8到10之间
  } else if (length <= 13) {
    fontSize = 16; // 字符数在11到13之间
  } else if (length <= 15) {
    fontSize = 14; // 字符数在14到15之间
  } else {
    fontSize = 12; // 字符数超过15时
  }

  return `${fontSize / size}px`; // 返回字体大小
};

const getSeedrandom = (seed: string) => {
  const rng = seedrandom(seed);
  return Math.floor(rng() * 10);
};
export const ImageName = (props: Props) => {
  // const [error, setError] = createSignal(false);
  const [url, setUrl] = createSignal<string>();
  const fontList = [
    fontColor1,
    fontColor2,
    fontColor3,
    fontColor4,
    fontColor5,
    fontColor6,
    fontColor7,
    fontColor8,
    fontColor9,
    fontColor10,
  ];
  onMount(() => {
    if (REGEX_URL.test(props.logo)) {
      setUrl(props.logo);
    } else {
      setUrl(import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `./${props.logo}`);
    }
  });

  return (
    <Show when={!isUndefined(url())}>
      {!isUndefined(props.name) ? (
        <div data-text={props.name} class={`d-flex w-100 h-100 ${Wrapper} ${fontList[getSeedrandom(props.name)]}`}>
          <div
            style={{ 'font-size': getFontSizeByNameLength(props.name, props.bigCard) }}
            class={`d-flex w-100 ${props.bigCard ? WrapperName : WrapperNameMini}`}
          >
            {props.name}
          </div>
          <div class={props.bigCard ? OpenHarmony : OpenHarmonyMini}>OpenHarmony TPC</div>
        </div>
      ) : (
        'logo'
      )}
    </Show>
  );
};
