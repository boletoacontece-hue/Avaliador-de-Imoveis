// Recursos do aparelho quando o Avaliador roda como aplicativo Android (Capacitor).
// No navegador, ehApp = false e as telas seguem o comportamento web de sempre.
import { Capacitor } from "@capacitor/core";

export const ehApp = Capacitor.isNativePlatform();

const blobParaBase64 = (blob) => new Promise((ok, falha) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1]);
  r.onerror = () => falha(new Error("Não foi possível preparar o arquivo."));
  r.readAsDataURL(blob);
});

/** Salva o PDF no aparelho e abre o compartilhamento (WhatsApp, e-mail, Drive…) ou o leitor de PDF. */
export async function pdfNoAparelho(blob, nome, { abrir = false } = {}) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { uri } = await Filesystem.writeFile({ path: `laudos/${nome}`, data: await blobParaBase64(blob), directory: Directory.Cache, recursive: true });
  if (abrir) {
    const { FileOpener } = await import("@capacitor-community/file-opener");
    await FileOpener.open({ filePath: uri, contentType: "application/pdf", openWithDefault: true });
  } else {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: nome, files: [uri], dialogTitle: "Enviar laudo" });
  }
}

/** Compartilha um texto/link: no app, tela nativa (WhatsApp etc.); no navegador, Web Share ou cópia. */
export async function compartilhar({ titulo, texto, url }) {
  if (ehApp) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: titulo, text: texto, url, dialogTitle: titulo });
    return "compartilhado";
  }
  if (navigator.share) { await navigator.share({ title: titulo, text: texto, url }); return "compartilhado"; }
  await navigator.clipboard.writeText(url || texto);
  return "copiado";
}

/** Foto pela câmera nativa (com orientação corrigida). Devolve Blob ou null se o usuário cancelar. */
export async function fotoDaCamera() {
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  try {
    const foto = await Camera.getPhoto({
      quality: 85, resultType: CameraResultType.Uri, source: CameraSource.Camera,
      correctOrientation: true, saveToGallery: false, width: 2000,
    });
    return await (await fetch(foto.webPath)).blob();
  } catch (e) {
    if (/cancel/i.test(e?.message || "")) return null;
    throw new Error("Não foi possível usar a câmera. Confira a permissão do aplicativo nas configurações do Android.");
  }
}

/** Ajustes de aplicativo: barra de status na cor da marca, tela de abertura e botão voltar do Android. */
export async function iniciarApp() {
  if (!ehApp) return;
  document.documentElement.classList.add("modo-app");
  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import("@capacitor/status-bar"), import("@capacitor/splash-screen"), import("@capacitor/app"),
  ]);
  try { await StatusBar.setStyle({ style: Style.Dark }); await StatusBar.setBackgroundColor({ color: "#1B3A1B" }); } catch { /* opcional */ }
  App.addListener("backButton", ({ canGoBack }) => {
    const raiz = /\/(dashboard)?$/.test(window.location.pathname);
    if (canGoBack && !raiz) window.history.back();
    else App.minimizeApp();
  });
  setTimeout(() => SplashScreen.hide().catch(() => {}), 300);
}
