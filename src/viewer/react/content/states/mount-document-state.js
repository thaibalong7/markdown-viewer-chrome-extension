import { mountContentUi, clearContentUi } from '../mount-content-ui.jsx'
import { DocumentState } from './DocumentState.jsx'

/** Transfer this empty target to React until the renderer replaces its contents. */
export function mountDocumentState(target, props) {
  clearContentUi(target)
  target.replaceChildren()
  return mountContentUi(target, DocumentState, props)
}
