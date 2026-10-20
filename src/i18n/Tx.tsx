import { Fragment, type ReactNode } from 'react';
import { t, type Vars } from './index';

/** Texto traduzido com marcação simples: `<b>negrito</b>`, `<i>itálico</i>` e `<br/>`. */
export function Tx({ k, v }: { k: string; v?: Vars }): ReactNode {
  const text = t(k, v);
  const out: ReactNode[] = [];
  const re = /<(b|i)>(.*?)<\/\1>|<br\/>/g;
  let last = 0, n = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[0] === '<br/>') out.push(<br key={n++} />);
    else out.push(m[1] === 'b' ? <b key={n++}>{m[2]}</b> : <i key={n++}>{m[2]}</i>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
