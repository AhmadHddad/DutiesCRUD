import { ReloadOutlined } from '@ant-design/icons';
import { Button, Layout, Tooltip, Typography } from 'antd';

import { dutyLabels } from '../i18n/dutiesLabels';

const { Header } = Layout;

interface DutiesPageHeaderProps {
  isRefreshing: boolean;
  onRefresh(): void;
}

export function DutiesPageHeader({ isRefreshing, onRefresh }: DutiesPageHeaderProps) {
  return (
    <Header className="app-header">
      <div className="app-header__inner">
        <div>
          <Typography.Title className="app-title" level={1}>
            {dutyLabels.app.title}
          </Typography.Title>
          <Typography.Text className="app-subtitle">{dutyLabels.app.subtitle}</Typography.Text>
        </div>
        <Tooltip title={dutyLabels.app.refreshTooltip}>
          <Button
            aria-label={dutyLabels.app.refreshAriaLabel}
            disabled={isRefreshing}
            icon={<ReloadOutlined />}
            onClick={onRefresh}
          />
        </Tooltip>
      </div>
    </Header>
  );
}
