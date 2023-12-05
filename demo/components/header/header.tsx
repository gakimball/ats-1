import { FunctionComponent } from 'preact';
import s from './header.module.css'

export const Header: FunctionComponent = ({
  children,
}) => {
  return (
    <div className={s.container}>
      <div className={s.rainbow} />
      <h1 className={s.title}>
        Audio TeleSystem&trade;

        <span className={s.titlesub}>
          Model 1
        </span>
      </h1>
      <div className={s.divider} />
      {children}
    </div>
  )
}
