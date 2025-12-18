/**
 * Layout Component
 * Wraps protected pages with sidebar and consistent layout
 */

import React from 'react';
import { Layout as AntLayout } from 'antd';
import Sidebar from './Sidebar';
import './Layout.css';

const { Content } = AntLayout;

const Layout = ({ children }) => {
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <AntLayout style={{ marginLeft: 260 }}>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: '12px', minHeight: 'calc(100vh - 48px)' }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
