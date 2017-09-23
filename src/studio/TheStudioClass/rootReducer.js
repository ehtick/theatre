// @flow
import {combineReducers} from 'redux'
import type {StoreState} from '$studio/types'
import wrapRootReducer from '$shared/utils/redux/wrapRootReducer'
import commonReducer from '$studio/common/reducer'
import workspaceReducer from '$studio/workspace/reducer'
import animationTimelineReducer from '$studio/animationTimeline/reducer'
import {type Reducer} from '$shared/types'

const mainReducer: Reducer<StoreState, any> =
  combineReducers({
    common: commonReducer,
    workspace: workspaceReducer,
    animationTimeline: animationTimelineReducer,
  })

export default wrapRootReducer(mainReducer)