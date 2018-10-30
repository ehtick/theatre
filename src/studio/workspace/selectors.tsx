import {Selector, ITheaterStoreState} from '$studio/types'
import {visiblePanelsList, IWorkspacePanel} from '$studio/workspace/types'

export const getVisiblePanelsList: Selector<visiblePanelsList, void> = state =>
  state.historicWorkspace.panels.listOfVisibles

export const getActivePanelId = (state: ITheaterStoreState) =>
  state.historicWorkspace.panels.idOfActivePanel

export const getPanelById: Selector<IWorkspacePanel, string> = (
  state,
  panelId,
) => state.historicWorkspace.panels.byId[panelId]
