import type {SequenceEditorTree_PrimitiveProp} from '@theatre/studio/panels/SequenceEditorPanel/layout/tree'
import React, {useEffect} from 'react'
import styled from 'styled-components'
import useRefAndState from '@theatre/studio/utils/useRefAndState'
import useContextMenu from '@theatre/studio/uiComponents/simpleContextMenu/useContextMenu'
import {getPasteKeyframesItem} from '@theatre/studio/uiComponents/simpleContextMenu/getCopyPasteKeyframesItem'
import {useTracksProvider} from '@theatre/studio/panels/SequenceEditorPanel/TracksProvider'

const Container = styled.li<{}>`
  margin: 0;
  padding: 0;
  list-style: none;
  box-sizing: border-box;
  position: relative;
`

const NodeWrapper = styled.div<{isEven: boolean; highlight: boolean}>`
  box-sizing: border-box;
  width: 100%;
  position: relative;

  &:before {
    position: absolute;
    display: block;
    content: ' ';
    left: -40px;
    top: 0;
    bottom: 0;
    right: 0;
    box-sizing: border-box;
    border-bottom: 1px solid #252b3869;
    background: ${(props) => (props.isEven ? 'transparent' : '#6b8fb505')};
    transition: background 0.15s ease-in-out;
  }

  &:before {
    transition: background 0.05s ease-in-out;
    background: ${(props) =>
      props.highlight
        ? '#7a22221f'
        : props.isEven
        ? 'transparent'
        : '#6b8fb505'};
  }
`

const Children = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row: React.FC<{
  leaf: SequenceEditorTree_PrimitiveProp
  node: React.ReactElement
}> = ({leaf, children, node}) => {
  const {trackId} = leaf
  const [ref, refNode] = useRefAndState<HTMLDivElement | null>(null)
  const [contextMenu, , isOpen] = useTrackContextMenu(refNode, {
    leaf,
  })

  const {trackToHighlight, setTrackToHighlight} = useTracksProvider()

  useEffect(() => {
    if (trackId && isOpen) {
      setTrackToHighlight(trackId)
    } else {
      setTrackToHighlight(undefined)
    }
  }, [trackId, isOpen])

  const hasChildren = Array.isArray(children) && children.length > 0

  return (
    <Container>
      <NodeWrapper
        style={{height: leaf.nodeHeight + 'px'}}
        isEven={leaf.n % 2 === 0}
        ref={ref}
        highlight={Boolean(trackId && trackToHighlight === trackId)}
      >
        {node}
      </NodeWrapper>
      {hasChildren && <Children>{children}</Children>}
      {trackId ? contextMenu : null}
    </Container>
  )
}

function useTrackContextMenu(
  node: HTMLDivElement | null,
  {
    leaf,
  }: {
    leaf: SequenceEditorTree_PrimitiveProp
  },
) {
  const pasteKeyframesItem = getPasteKeyframesItem(leaf)

  return useContextMenu(node, {
    items: () => {
      if (pasteKeyframesItem) {
        return [pasteKeyframesItem]
      }
      return []
    },
  })
}

export default Row
