import { Group, Progress, Skeleton, Text, Tooltip } from '@mantine/core';
import { IconDatabase } from '@tabler/icons-react';

import { formatBytes } from '../lib/formatBytes.js';
import classes from '../Files.module.scss';

/**
 * Dezente Fußzeile mit der Belegung der SSD. Färbt sich erst ein, wenn es eng
 * wird – eine dauerhaft rote Anzeige würde man nach zwei Tagen ignorieren.
 */
export default function StorageFooter({ usage, isLoading }) {
  if (isLoading) {
    return <Skeleton height={12} width={260} mt="lg" radius="sm" />;
  }

  if (!usage) return null;

  const percent = usage.totalBytes > 0 ? (usage.usedBytes / usage.totalBytes) * 100 : 0;
  const color = percent > 90 ? 'red' : percent > 75 ? 'yellow' : 'teal';

  return (
    <Group gap="xs" mt="lg" wrap="nowrap" className={classes.storageFooter}>
      <IconDatabase size={14} className={classes.storageIcon} />
      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
        {formatBytes(usage.usedBytes)} von {formatBytes(usage.totalBytes)} belegt
      </Text>
      <Tooltip label={`${formatBytes(usage.freeBytes)} frei`} withArrow>
        <Progress value={percent} color={color} size="xs" radius="xl" className={classes.storageBar} />
      </Tooltip>
    </Group>
  );
}
