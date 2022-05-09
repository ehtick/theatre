import type {PropTypeConfig_Rgba} from '@theatre/core/propTypes'
import type {Rgba} from '@theatre/shared/utils/color'
import {
  decorateRgba,
  rgba2hex,
  parseRgbaFromHex,
} from '@theatre/shared/utils/color'
import React, {useCallback, useRef} from 'react'
import {useEditingToolsForPrimitiveProp} from './utils/useEditingToolsForPrimitiveProp'
import {SingleRowPropEditor} from './utils/SingleRowPropEditor'
import {RgbaColorPicker} from '@theatre/studio/uiComponents/colorPicker'
import styled from 'styled-components'
import usePopover from '@theatre/studio/uiComponents/Popover/usePopover'
import BasicStringInput from '@theatre/studio/uiComponents/form/BasicStringInput'
import {popoverBackgroundColor} from '@theatre/studio/uiComponents/Popover/BasicPopover'
import type {IPropEditorFC} from './utils/IPropEditorFC'

const RowContainer = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  gap: 4px;
`

interface PuckProps {
  background: Rgba
}

const Puck = styled.div.attrs<PuckProps>((props) => ({
  style: {
    background: props.background,
  },
}))<PuckProps>`
  height: calc(100% - 12px);
  aspect-ratio: 1;
  border-radius: 2px;
`

const HexInput = styled(BasicStringInput)`
  flex: 1;
`

const noop = () => {}

const RgbaPopover = styled.div`
  position: absolute;
  background-color: ${popoverBackgroundColor};
  color: white;
  padding: 0;
  margin: 0;
  cursor: default;
  border-radius: 3px;
  z-index: 10000;
  backdrop-filter: blur(8px);

  padding: 4;
  pointer-events: all;

  border: none;
  box-shadow: none;
`

const RgbaPropEditor: IPropEditorFC<PropTypeConfig_Rgba> = ({
  propConfig,
  pointerToProp,
  obj,
}) => {
  const containerRef = useRef<HTMLDivElement>(null!)

  const stuff = useEditingToolsForPrimitiveProp(pointerToProp, obj, propConfig)

  const onChange = useCallback(
    (color: string) => {
      const rgba = decorateRgba(parseRgbaFromHex(color))
      stuff.permanentlySetValue(rgba)
    },
    [stuff],
  )

  const [popoverNode, openPopover] = usePopover({}, () => {
    return (
      <RgbaPopover>
        <RgbaColorPicker
          color={{
            r: stuff.value.r,
            g: stuff.value.g,
            b: stuff.value.b,
            a: stuff.value.a,
          }}
          temporarilySetValue={(color) => {
            const rgba = decorateRgba(color)
            stuff.temporarilySetValue(rgba)
          }}
          permanentlySetValue={(color) => {
            // console.log('perm')
            const rgba = decorateRgba(color)
            stuff.permanentlySetValue(rgba)
          }}
          discardTemporaryValue={stuff.discardTemporaryValue}
        />
      </RgbaPopover>
    )
  })

  return (
    <SingleRowPropEditor {...{stuff, propConfig, pointerToProp}}>
      <RowContainer>
        <Puck
          background={stuff.value}
          ref={containerRef}
          onClick={(e) => {
            openPopover(e, containerRef.current)
          }}
        />
        <HexInput
          value={rgba2hex(stuff.value)}
          temporarilySetValue={noop}
          discardTemporaryValue={noop}
          permanentlySetValue={onChange}
          isValid={(v) => !!v.match(/^#?([0-9a-f]{8})$/i)}
        />
      </RowContainer>
      {popoverNode}
    </SingleRowPropEditor>
  )
}

export default RgbaPropEditor
