import { FunctionComponent } from 'preact';
import s from './palette-viewer.module.css'

interface PaletteViewerProps {
  colors: string[];
  onSelectColor: (hexCode: string) => void;
}

export const PaletteViewer: FunctionComponent<PaletteViewerProps> = ({
  colors,
  onSelectColor,
}) => {
  return (
    <div className={s.container}>
      {colors.map((color, index) => {
        const hex = index.toString(16).padStart(2, '0')

        return (
          <button
            key={color}
            type="button"
            className={s.color}
            onClick={() => onSelectColor(`0x${hex}`)}
            style={{
              '--PaletteViewer-color': color,
            }}
          >
            {hex}
          </button>
        )
      })}
    </div>
  )
}
