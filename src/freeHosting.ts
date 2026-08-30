/**
 * 無料/汎用ホスティングサービスのドメイン一覧。
 *
 * これらのドメイン上に開設されたサブドメインは誰でも無料かつ匿名で
 * 取得できるため、フィッシングサイトのホスティング先として悪用されやすい。
 * ここに一致した場合は「危険」までは言い切れないが「注意」を促す。
 */
export const FREE_HOSTING_DOMAINS: string[] = [
  'firebaseapp.com',
  'web.app',
  'herokuapp.com',
  'github.io',
  'netlify.app',
  'vercel.app',
  'pages.dev',
  'glitch.me',
  'repl.co',
  'weebly.com',
  'wixsite.com',
  'blogspot.com',
  'appspot.com',
  'surge.sh',
  'onrender.com',
  '000webhostapp.com',
  'ngrok.io',
  'ngrok-free.app',
  'workers.dev',
];
