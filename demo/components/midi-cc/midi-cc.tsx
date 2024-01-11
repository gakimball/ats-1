import { FunctionComponent } from 'preact';
import { useImperativeHandle, useState } from 'preact/hooks';
import { useEventHandler } from '../../hooks/use-event-handler';
import { JSXInternal } from 'preact/src/jsx';
import { CONTROL_CHANGE } from '../../utils/constants';
import { forwardRef } from 'preact/compat';

interface MidiCCProps {
  onMidiMessage: (message: Uint8Array) => void;
}

export interface MidiCCRef {
  setValue: (id: number, value: number) => void;
  transmitAllValues: () => void;
}

export const MidiCC = forwardRef<MidiCCRef, MidiCCProps>(({
  onMidiMessage,
}, ref) => {
  const [active, setActive] = useState(0)
  const [state, setState] = useState<number[]>(Array(128).fill(0))

  const setCCNumber = useEventHandler((id: number, value: number) => {
    setState(prev => {
      const next = [...prev]
      next[id] = value
      return next
    })
  })

  const handleCCChange = useEventHandler((event: JSXInternal.TargetedEvent<HTMLInputElement>) => {
    setActive(Number.parseInt(event.currentTarget.value, 10))
  })

  const sendCCMessage = useEventHandler((event: JSXInternal.TargetedEvent<HTMLInputElement>) => {
    const value = Number.parseInt(event.currentTarget.value, 10)

    setCCNumber(active, value)
    onMidiMessage(new Uint8Array([
      CONTROL_CHANGE << 4,
      active,
      value,
    ]))
  })

  useImperativeHandle(ref, () => ({
    setValue: setCCNumber,
    transmitAllValues: () => {
      console.log({ state })
      state.forEach((value, id) => {
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
      <input
        value={active}
        onChange={handleCCChange}
        type="number"
        min="0"
        max="127"
        step="1"
      />
      <br />
      <span style={{ display: 'inline-block', width: '30px' }}>{state[active]}</span>
      <input
        value={state[active]}
        onChange={sendCCMessage}
        type="range"
        min="0"
        max="127"
        step="1"
      />
    </div>
  )
})
