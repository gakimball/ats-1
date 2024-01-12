import { forwardRef } from 'preact/compat';
import { useEffect, useImperativeHandle, useRef, useState } from 'preact/hooks';
import { useEventHandler } from '../../hooks/use-event-handler';
import { CONTROL_CHANGE } from '../../utils/constants';
import s from './midi-cc.module.css'

interface MidiCCProps {
  ccLabels: string[];
  onMidiMessage: (message: Uint8Array) => void;
}

export interface MidiCCRef {
  setValue: (id: number, value: number) => void;
  transmitAllValues: () => void;
}

export const MidiCC = forwardRef<MidiCCRef, MidiCCProps>(({
  ccLabels,
  onMidiMessage,
}, ref) => {
  const [ccValues, setCCValues] = useState<number[]>(Array(128).fill(0))
  const [ccOffset, setCCOffset] = useState(0)

  const activeCCKnob = useRef<{
    ccId: number;
    startValue: number;
    startX: number;
  }>()

  const setCCNumber = useEventHandler((id: number, value: number) => {
    setCCValues(prev => {
      const next = [...prev]
      next[id] = value
      return next
    })
  })

  const handleMouseDown = useEventHandler((event: MouseEvent, ccId: number) => {
    activeCCKnob.current = {
      ccId,
      startValue: ccValues[ccId],
      startX: event.pageX,
    }
  })

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (activeCCKnob.current) {
        const { ccId, startValue, startX } = activeCCKnob.current
        let nextValue = startValue + event.pageX - startX
        nextValue = Math.max(0, Math.min(127, nextValue))

        setCCNumber(ccId, nextValue)
        onMidiMessage(new Uint8Array([
          CONTROL_CHANGE << 4,
          ccId,
          nextValue,
        ]))
      }
    }

    window.addEventListener('mousemove', handle)
    return () => window.removeEventListener('mousemove', handle)
  }, [onMidiMessage])

  useEffect(() => {
    const handle = () => {
      activeCCKnob.current = undefined
    }

    window.addEventListener('mouseup', handle)
    return () => window.removeEventListener('mouseup', handle)
  })

  useImperativeHandle(ref, () => ({
    setValue: setCCNumber,
    transmitAllValues: () => {
      console.log({ state: ccValues })
      ccValues.forEach((value, id) => {
        onMidiMessage(new Uint8Array([
          CONTROL_CHANGE << 4,
          id,
          value,
        ]))
      })
    }
  }))

  return (
    <div>
      {[0, 1, 2, 3].map(index => {
        const ccId = (ccOffset * 4) + index

        return (
          <div
            key={ccId}
            className={s.row}
          >
            <div
              className={s.knob}
              style={{
                '--MidiCC-knob-rotation': ccValues[ccId],
              }}
              onMouseDown={event => handleMouseDown(event, ccId)}
            />
            <div className={s.value}>
              {ccId}: {ccValues[ccId]}
            </div>
            <div className={s.label}>
              {ccLabels[ccId]}
            </div>
          </div>
        )
      })}
    </div>
  )
})
