import cx from "classnames";
import { useCallback, useState, useRef } from 'react'

import './Tooltip.css'

const isTouch = 'ontouchstart' in window

export default function Tooltip(props) {
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef(null)

  const position = props.position ?? 'left-bottom'
  const trigger = props.trigger ?? 'hover'

  const onMouseEnter = useCallback(() => {
    if (trigger !== 'hover' || isTouch) return

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setVisible(true)
  }, [setVisible, intervalRef, trigger])

  const onMouseClick = useCallback(() => {
    if (trigger !== 'click' && !isTouch) return

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setVisible(true)
  }, [setVisible, intervalRef, trigger])

  const onMouseLeave = useCallback(() => {
    intervalRef.current = setTimeout(() => {
      setVisible(false)
      intervalRef.current = null
    }, 150)
  }, [setVisible, intervalRef])

  return (
    <span className="Tooltip" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onMouseClick}>
      <span className={cx({'Tooltip-handle': !props.disableHandleStyle, [props.handleClassName]: true})}>
        {props.handle}
       </span>
      {visible && 
        <div className={cx(['Tooltip-popup', position])}>
          {props.children}
        </div>
      }
    </span>
  )
}