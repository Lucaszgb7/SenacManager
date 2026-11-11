import { hasValidImageSignature } from '../../controllers/ProfileController';

describe('Segurança — Validação Rigorosa de Upload de Imagens', () => {
  it('deve aceitar imagem JPEG com assinatura válida (FF D8 FF)', () => {
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(hasValidImageSignature(validJpeg, 'image/jpeg')).toBe(true);
  });

  it('deve aceitar imagem PNG com assinatura válida (89 50 4E 47 0D 0A 1A 0A)', () => {
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(hasValidImageSignature(validPng, 'image/png')).toBe(true);
  });

  it('deve aceitar imagem WebP com assinatura válida (RIFF...WEBP)', () => {
    const validWebp = Buffer.from('RIFF\x20\x00\x00\x00WEBPVP8 ', 'binary');
    expect(hasValidImageSignature(validWebp, 'image/webp')).toBe(true);
  });

  it('deve rejeitar arquivo executável Windows PE disfarçado (MZ header)', () => {
    // Executável Windows (MZ) com mimetype forjado
    const fakeExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    expect(hasValidImageSignature(fakeExe, 'image/jpeg')).toBe(false);
    expect(hasValidImageSignature(fakeExe, 'image/png')).toBe(false);
  });

  it('deve rejeitar arquivo binário Linux ELF disfarçado', () => {
    const fakeElf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(hasValidImageSignature(fakeElf, 'image/png')).toBe(false);
  });

  it('deve rejeitar scripts embutidos com tags HTML/PHP disfarçadas', () => {
    const scriptPayload = Buffer.from('<script>alert("xss")</script><svg>...', 'utf-8');
    expect(hasValidImageSignature(scriptPayload, 'image/jpeg')).toBe(false);

    const phpPayload = Buffer.from('<?php system($_GET["cmd"]); ?>', 'utf-8');
    expect(hasValidImageSignature(phpPayload, 'image/png')).toBe(false);
  });

  it('deve rejeitar buffers vazios ou menores que 12 bytes', () => {
    expect(hasValidImageSignature(Buffer.from([]), 'image/jpeg')).toBe(false);
    expect(hasValidImageSignature(Buffer.from([0xff, 0xd8]), 'image/jpeg')).toBe(false);
  });
});
