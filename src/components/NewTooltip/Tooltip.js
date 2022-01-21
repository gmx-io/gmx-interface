import cx from "classnames";
import { useCallback, useState, useRef } from 'react'

import './Tooltip.css'
import infoIcon from '../../img/ic_info.svg'

const isTouch = 'ontouchstart' in window

const OPEN_DELAY = 0
const CLOSE_DELAY = 100

export default function Tooltip(props) {
  const [visible, setVisible] = useState(false)
  const intervalCloseRef = useRef(null)
  const intervalOpenRef = useRef(null)

  const { tooltipIconPosition = 'left' } = props

  const position = props.position ?? 'left-bottom'
  const trigger = props.trigger ?? 'hover'

  const onMouseEnter = useCallback(() => {
    if (trigger !== 'hover' || isTouch) return

    if (intervalCloseRef.current) {
      clearInterval(intervalCloseRef.current)
      intervalCloseRef.current = null
    }
    if (!intervalOpenRef.current) {
      intervalOpenRef.current = setTimeout(() => {
        setVisible(true)
        intervalOpenRef.current = null
      }, OPEN_DELAY)
    }
  }, [setVisible, intervalCloseRef, intervalOpenRef, trigger])

  const onMouseClick = useCallback(() => {
    if (trigger !== 'click' && !isTouch) return

    if (intervalCloseRef.current) {
      clearInterval(intervalCloseRef.current)
      intervalCloseRef.current = null
    }
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current)
      intervalOpenRef.current = null
    }
    setVisible(true)
  }, [setVisible, intervalCloseRef, trigger])

  const onMouseLeave = useCallback(() => {
    intervalCloseRef.current = setTimeout(() => {
      setVisible(false)
      intervalCloseRef.current = null
    }, CLOSE_DELAY)
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current)
      intervalOpenRef.current = null
    }
  }, [setVisible, intervalCloseRef])

  return (
    <span className="Tooltip">
      {tooltipIconPosition === 'left' && <span className={cx({ 'Tooltip-handle': !props.disableHandleStyle }, [props.handleClassName])} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onMouseClick}>
        <img src={infoIcon} alt="infoIcon" width="14px" />
      </span>}
      {props.handle}
      {visible &&
        <div className={cx(['Tooltip-popup', position])} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onMouseClick}>
          {props.renderContent()}
        </div>
      }
      {tooltipIconPosition === 'right' && <span className={cx({ 'Tooltip-handle': !props.disableHandleStyle }, 'right', [props.handleClassName])} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onMouseClick}>
        <img src={infoIcon} alt="infoIcon" width="14px" />
      </span>}
    </span>
  )
}
