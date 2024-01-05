import { FunctionComponent } from 'preact';
import { useState } from 'preact/hooks';
import { useEventHandler } from '../../hooks/use-event-handler';
import { JSXInternal } from 'preact/src/jsx';
import { CONTROL_CHANGE } from '../../utils/constants';

interface MidiCCProps {
  onMidiMessage: (message: Uint8Array) => void;
}

export const MidiCC: FunctionComponent<MidiCCProps> = ({
  onMidiMessage,
}) => {
  const [active, setActive] = useState(0)
  const [state, setState] = useState(Array(128).fill(0))

  const changeCCNumber = useEventHandler((event: JSXInternal.TargetedEvent<HTMLInputElement>) => {
    setActive(Number.parseInt(event.currentTarget.value, 10))
  })

  const sendCCMessage = useEventHandler((event: JSXInternal.TargetedEvent<HTMLInputElement>) => {
    const value = Number.parseInt(event.currentTarget.value, 10)

    setState(prev => {
      const next = [...prev]
      next[active] = value
      return next
    })

    onMidiMessage(new Uint8Array([
      CONTROL_CHANGE << 4,
      active,
      value,
    ]))
  })

  return (
    <div>
      <input
        value={active}
        onChange={changeCCNumber}
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
}
