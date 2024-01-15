import { FunctionComponent } from 'preact';
import classnames from 'classnames'
import s from './midi-pc.module.css'

interface MidiPCProps {
  onChange: (value: number) => void;
  value: number;
}

export const MidiPC: FunctionComponent<MidiPCProps> = ({
  onChange,
  value,
}) => {
  return (
    <div>
      <p className={s.title}>
        Program Change
      </p>
      {[0, 1, 2, 3].map(index => (
        <div
          key={index}
          className={s.row}
        >
          <button
            type="button"
            className={`${s.button} ${index === value ? s.active : ''}`}
            onClick={() => onChange(index)}
          />
          <p className={s.label}>
            {index}
          </p>
        </div>
      ))}
    </div>
  )
}
