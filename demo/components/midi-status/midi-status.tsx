import { FunctionComponent } from 'preact';

interface MIDIStatusProps {
  inputMap: MIDIInputMap | undefined;
  onConnectMidi: () => void;
  onChangeInput: (key: string) => void;
  selectedInput: string | undefined;
}

const NO_INPUTS = '$NO_INPUTS'

export const MIDIStatus: FunctionComponent<MIDIStatusProps> = ({
  inputMap,
  onConnectMidi,
  onChangeInput,
  selectedInput,
}) => {
  const inputsAvailable = inputMap !== undefined && inputMap.size > 0

  return (
    <>
      <button
        type="button"
        onClick={onConnectMidi}
      >
        Connect MIDI
      </button>
      <select
        value={inputsAvailable ? selectedInput : NO_INPUTS}
        onChange={e => onChangeInput(e.currentTarget.value)}
      >
        {!inputsAvailable && (
          <option value={NO_INPUTS} disabled>
            (built-in keyboard)
          </option>
        )}
        {inputsAvailable && [...inputMap.entries()].map(([key, input]) => (
          <option key={key} value={key}>
            {input.name}
          </option>
        ))}
      </select>
    </>
  )
}
