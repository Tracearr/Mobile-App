import {
  Box,
  Host,
  Image,
  LazyColumn,
  ListItem,
  Text,
  TriStateCheckbox,
  type ListItemColors,
  type ToggleableState,
} from '@expo/ui/jetpack-compose';
import { background, clip, Shapes, size, toggleable } from '@expo/ui/jetpack-compose/modifiers';
import { ACCENT_COLOR, colors } from '../lib/theme';
import { serverLogo } from '../lib/serverLogos';
import { serverSubtitle } from '../lib/utils';
import { useMediaServer } from '../providers/MediaServerProvider';
import { useTranslation } from '@tracearr/translations/mobile';

const ROW_COLORS: ListItemColors = {
  containerColor: colors.background.dark,
  contentColor: colors.text.primary.dark,
  supportingContentColor: colors.text.muted.dark,
};

function CheckRow({
  state,
  enabled = true,
  onToggle,
  title,
  subtitle,
  color,
  logo,
}: {
  state: ToggleableState;
  enabled?: boolean;
  onToggle: () => void;
  title: string;
  subtitle?: string;
  color?: string | null;
  logo?: number;
}) {
  return (
    <ListItem
      colors={ROW_COLORS}
      modifiers={[toggleable(state === 'on', onToggle, { role: 'checkbox', enabled })]}
    >
      {logo !== undefined ? (
        <ListItem.LeadingContent>
          <Image source={logo} contentDescription={null} modifiers={[size(20, 20)]} />
        </ListItem.LeadingContent>
      ) : color ? (
        <ListItem.LeadingContent>
          <Box modifiers={[size(12, 12), clip(Shapes.Circle), background(color)]} />
        </ListItem.LeadingContent>
      ) : null}
      <ListItem.HeadlineContent>
        <Text>{title}</Text>
      </ListItem.HeadlineContent>
      {subtitle ? (
        <ListItem.SupportingContent>
          <Text>{subtitle}</Text>
        </ListItem.SupportingContent>
      ) : null}
      <ListItem.TrailingContent>
        <TriStateCheckbox
          state={state}
          enabled={enabled}
          colors={{ checkedColor: ACCENT_COLOR, uncheckedColor: colors.text.muted.dark }}
        />
      </ListItem.TrailingContent>
    </ListItem>
  );
}

export function ServerSelector() {
  const { t } = useTranslation(['mobile', 'common']);
  const { servers, selectedServerIds, isAllServersSelected, toggleServer, selectAllServers } =
    useMediaServer();

  return (
    <Host colorScheme="dark" style={{ flex: 1 }}>
      <LazyColumn>
        <CheckRow
          state={isAllServersSelected ? 'on' : 'indeterminate'}
          onToggle={selectAllServers}
          title={t('mobile:serverSelector.allServers')}
        />
        {servers.map((server) => {
          const checked = selectedServerIds.includes(server.id);
          return (
            <CheckRow
              key={server.id}
              state={checked ? 'on' : 'off'}
              enabled={!(checked && selectedServerIds.length === 1)}
              onToggle={() => toggleServer(server.id)}
              title={server.name}
              subtitle={serverSubtitle(server, t('common:serverSelector.historical'))}
              color={server.color}
              logo={serverLogo(server.type)}
            />
          );
        })}
      </LazyColumn>
    </Host>
  );
}
