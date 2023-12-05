import { FunctionComponent } from 'preact';
import s from './nav-item.module.css'

interface NavItemProps {
  onClick: () => void;
}

export const NavItem: FunctionComponent<NavItemProps> = ({
  children,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={s.container}
      onClick={() => onClick()}
    >
      {children}
    </button>
  )
}
