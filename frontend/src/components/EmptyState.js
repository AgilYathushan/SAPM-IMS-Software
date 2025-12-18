// EmptyState Component
// Displays a friendly empty state message when there's no data to display
// Uses Ant Design for attractive UI

import React from 'react';
import { Empty } from 'antd';
import './EmptyState.css';

const EmptyState = ({ message = "No data found", description = "There's nothing to display here yet." }) => {
  return (
    <div className="empty-state">
      <Empty
        description={
          <div>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>{message}</p>
            <p style={{ fontSize: '14px', color: '#999' }}>{description}</p>
          </div>
        }
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </div>
  );
};

export default EmptyState;
