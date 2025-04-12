declare module '@trendmicro/react-toggle-switch' {
  import { FC } from 'react';

  interface ToggleSwitchProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    className?: string;
  }

  const ToggleSwitch: FC<ToggleSwitchProps>;
  export default ToggleSwitch;
}