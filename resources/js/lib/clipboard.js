// Copies text to the clipboard, falling back to execCommand for browsers/contexts
// (e.g. plain HTTP, older Safari) where navigator.clipboard is unavailable or rejects.
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // fall through to legacy fallback
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch (e) {
    succeeded = false;
  }
  document.body.removeChild(textarea);

  return succeeded;
}
