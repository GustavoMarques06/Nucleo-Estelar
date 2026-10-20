// Integridade do save: cada save sai assinado; editar o texto (no localStorage ou no arquivo exportado) quebra a
// assinatura. Não é segurança de verdade — o jogo roda inteiro no navegador e quem domina o DevTools contorna —,
// mas barra a trapaça casual e deixa marcado, para sempre, o progresso que veio de um save modificado.

const SALT = 'K17·acendedores·17-pulsos';

/** cyrb53: hash rápido de 53 bits (não criptográfico; serve para detectar edição, não para resistir a ataque). */
function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Assinatura do texto do save (dois hashes com sementes diferentes, em hexadecimal). */
export function sign(body: string): string {
  const text = SALT + body;
  return cyrb53(text, 17).toString(16).padStart(14, '0') + cyrb53(text, 1717).toString(16).padStart(14, '0');
}

/** Acrescenta a assinatura ao JSON de um save (sem mudar a ordem das outras chaves). */
export function withSignature(body: string): string {
  return body.slice(0, -1) + `,"sig":"${sign(body)}"}`;
}

export type SignatureCheck = 'ok' | 'legacy' | 'bad';

/**
 * Confere a assinatura de um save já lido (objeto do JSON). `legacy` = save de antes da assinatura existir
 * (aceito sem marca); `bad` = assinatura ausente num save novo, ou que não confere com o conteúdo.
 */
export function checkSignature(d: Record<string, unknown>, signedSince: number): SignatureCheck {
  const { sig, ...rest } = d;
  if (typeof sig !== 'string') return typeof d.version === 'number' && d.version < signedSince ? 'legacy' : 'bad';
  return sig === sign(JSON.stringify(rest)) ? 'ok' : 'bad';
}
