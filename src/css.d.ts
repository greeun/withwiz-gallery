/** CSS side-effect import 를 TypeScript / tsup 타입 선언 빌드가 인식하도록 ambient module 선언.
 *  실제 CSS 는 tsup external + onSuccess copy 로 dist/ 에 따로 산출. */
declare module "*.css";
