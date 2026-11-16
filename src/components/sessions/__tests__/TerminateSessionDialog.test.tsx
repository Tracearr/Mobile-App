/* eslint-env jest */
import { render, screen } from '@testing-library/react-native';

import { TerminateSessionDialog } from '../TerminateSessionDialog';

jest.mock('../../../hooks/useTerminateSession', () => ({
  useTerminateSession: () => ({ mutate: jest.fn(), isPending: false }),
}));

test('names the person without an @ handle', async () => {
  await render(
    <TerminateSessionDialog
      visible
      onClose={() => {}}
      sessionId="s-1"
      mediaTitle="Inception"
      name="Alice"
    />
  );
  expect(screen.getByText('Stop "Inception" for Alice?')).toBeTruthy();
});
