import { beforeEach, describe, expect, it, mock } from 'bun:test';
import * as navigation from 'next/navigation';
import { mockSession } from '../../tests-support.ts';

const sessionHolder: { value: { user: { id: string } } | null } = {
  value: null,
};

mockSession(() => sessionHolder.value);

mock.module('next/navigation', () => ({
  ...navigation,
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { default: HomePage } = await import('../../src/app/page.tsx');

describe('HomePage', () => {
  beforeEach(() => {
    sessionHolder.value = null;
  });

  it('redirects logged-out visitors to the Pharmaplast landing page', async () => {
    await expect(HomePage()).rejects.toThrow('redirect:/');
  });

  it('redirects logged-in visitors to their issues', async () => {
    sessionHolder.value = { user: { id: 'user-1' } };

    await expect(HomePage()).rejects.toThrow('redirect:/my-issues');
  });
});
