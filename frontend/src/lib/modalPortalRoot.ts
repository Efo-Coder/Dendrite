/** DOM-Knoten für Portale — immer *nach* #root, damit die Stapelfolge ohne z-index stimmt. */
export function getModalPortalRoot(): HTMLElement {
  return document.getElementById('modal-root') ?? document.body;
}
