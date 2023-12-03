import { FunctionComponent } from 'preact';
import copyTextToClipboard from 'copy-text-to-clipboard'
import s from './palette-viewer.module.css'

interface PaletteViewerProps {
  colors: string[];
}

export const PaletteViewer: FunctionComponent<PaletteViewerProps> = ({
  colors,
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
            onClick={() => copyTextToClipboard(`0x${hex}`)}
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
