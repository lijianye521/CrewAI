'use client';

import { ConfigProvider } from 'antd';
import theme from './theme/config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={theme}>
      {children}
    </ConfigProvider>
  );
}