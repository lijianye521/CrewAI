'use client';

import { ConfigProvider, App } from 'antd';
import theme from './theme/config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={theme}>
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
}