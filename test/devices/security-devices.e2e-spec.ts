import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateUserInputDto } from '../../src/modules/user-accounts/users/api/dto';
import { createUser, runAfterAllSetup, runBeforeAllSetup } from '../helpers';

type DeviceView = {
  ip: string;
  title: string;
  lastActiveDate: string;
  deviceId: string;
};

describe('DevicesController (e2e) - /api/security/devices', () => {
  let app: INestApplication;
  let basicAuthorization: { Authorization: string };

  beforeAll(async () => {
    ({ app, basicAuthorization } = await runBeforeAllSetup());
  });

  afterEach(async () => {
    await request(app.getHttpServer())
      .delete('/api/testing/all-data')
      .expect(HttpStatus.NO_CONTENT);
  });

  afterAll(async () => {
    if (app) {
      await runAfterAllSetup(app);
    }
  });

  const createConfirmedUser = async (payload: CreateUserInputDto) =>
    createUser(app, basicAuthorization, payload);

  const loginAndGetRefreshCookie = async (
    loginOrEmail: string,
    password: string,
    userAgent: string,
  ) => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('user-agent', userAgent)
      .send({ loginOrEmail, password })
      .expect(HttpStatus.OK);

    const setCookie = response.headers['set-cookie'];
    if (!Array.isArray(setCookie) || setCookie.length === 0) {
      throw new Error('No refresh token cookie in login response');
    }

    return setCookie[0].split(';')[0];
  };

  const getSecurityDevices = (refreshCookie: string) =>
    request(app.getHttpServer())
      .get('/api/security/devices')
      .set('Cookie', refreshCookie);

  it('returns 401 for GET /security/devices without refresh token cookie', async () => {
    await request(app.getHttpServer())
      .get('/api/security/devices')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns all active sessions for current user', async () => {
    const user: CreateUserInputDto = {
      login: 'devuser1',
      password: 'secret12',
      email: 'devices-user@example.com',
    };

    await createConfirmedUser(user);

    const cookieA = await loginAndGetRefreshCookie(
      user.login,
      user.password,
      'Chrome Session A',
    );
    await loginAndGetRefreshCookie(
      user.login,
      user.password,
      'Firefox Session B',
    );

    const { body } = await getSecurityDevices(cookieA).expect(HttpStatus.OK);

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ip: expect.any(String),
          title: expect.any(String),
          lastActiveDate: expect.any(String),
          deviceId: expect.any(String),
        }),
      ]),
    );
  });

  it('deletes all sessions except current', async () => {
    const user: CreateUserInputDto = {
      login: 'devkeep1',
      password: 'secret12',
      email: 'devices-keep@example.com',
    };

    await createConfirmedUser(user);

    const currentCookie = await loginAndGetRefreshCookie(
      user.login,
      user.password,
      'Current Session',
    );
    const otherCookie = await loginAndGetRefreshCookie(
      user.login,
      user.password,
      'Other Session',
    );

    await request(app.getHttpServer())
      .delete('/api/security/devices')
      .set('Cookie', currentCookie)
      .expect(HttpStatus.NO_CONTENT);

    const { body } = await getSecurityDevices(currentCookie).expect(
      HttpStatus.OK,
    );
    expect(body).toHaveLength(1);

    await request(app.getHttpServer())
      .post('/api/auth/refresh-token')
      .set('Cookie', otherCookie)
      .expect(HttpStatus.UNAUTHORIZED);

    await request(app.getHttpServer())
      .post('/api/auth/refresh-token')
      .set('Cookie', currentCookie)
      .expect(HttpStatus.OK);
  });

  it('deletes current session by device id', async () => {
    const user: CreateUserInputDto = {
      login: 'devdel1',
      password: 'secret12',
      email: 'devices-delete@example.com',
    };

    await createConfirmedUser(user);

    const cookie = await loginAndGetRefreshCookie(
      user.login,
      user.password,
      'Delete By Id Session',
    );

    const { body } = await getSecurityDevices(cookie).expect(HttpStatus.OK);
    expect(body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/api/security/devices/${body[0].deviceId}`)
      .set('Cookie', cookie)
      .expect(HttpStatus.NO_CONTENT);

    await getSecurityDevices(cookie).expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 403 when trying to delete another user session', async () => {
    const userA: CreateUserInputDto = {
      login: 'devices_a',
      password: 'secret12',
      email: 'devices-a@example.com',
    };

    const userB: CreateUserInputDto = {
      login: 'devices_b',
      password: 'secret12',
      email: 'devices-b@example.com',
    };

    await createConfirmedUser(userA);
    await createConfirmedUser(userB);

    const cookieA = await loginAndGetRefreshCookie(
      userA.login,
      userA.password,
      'Owner A Session',
    );
    const cookieB = await loginAndGetRefreshCookie(
      userB.login,
      userB.password,
      'Owner B Session',
    );

    const { body } = await getSecurityDevices(cookieB).expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .delete(`/api/security/devices/${body[0].deviceId}`)
      .set('Cookie', cookieA)
      .expect(HttpStatus.FORBIDDEN);
  });

  it('returns 400 for invalid device id format and 404 for missing device', async () => {
    const user: CreateUserInputDto = {
      login: 'deverr1',
      password: 'secret12',
      email: 'devices-errors@example.com',
    };

    await createConfirmedUser(user);

    const cookie = await loginAndGetRefreshCookie(
      user.login,
      user.password,
      'Errors Session',
    );

    const invalidIdResponse = await request(app.getHttpServer())
      .delete('/api/security/devices/not-a-uuid')
      .set('Cookie', cookie)
      .expect(HttpStatus.BAD_REQUEST);

    expect(invalidIdResponse.body.errorsMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Invalid UUID: not-a-uuid' }),
      ]),
    );

    await request(app.getHttpServer())
      .delete('/api/security/devices/550e8400-e29b-41d4-a716-446655440000')
      .set('Cookie', cookie)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('supports lifecycle operations across multiple devices and keeps current session active', async () => {
    const user: CreateUserInputDto = {
      login: 'devflow1',
      password: 'secret12',
      email: 'devices-flow@example.com',
    };

    await createConfirmedUser(user);

    const device1UserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    const device2UserAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0';
    const device3UserAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15';
    const device4UserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) OPR/110.0.0.0 Safari/537.36';

    let device1Cookie = await loginAndGetRefreshCookie(
      user.login,
      user.password,
      device1UserAgent,
    );
    const device2Cookie = await loginAndGetRefreshCookie(
      user.login,
      user.password,
      device2UserAgent,
    );
    const device3Cookie = await loginAndGetRefreshCookie(
      user.login,
      user.password,
      device3UserAgent,
    );
    await loginAndGetRefreshCookie(user.login, user.password, device4UserAgent);

    const { body: devicesBeforeRefresh } = await getSecurityDevices(
      device1Cookie,
    ).expect(HttpStatus.OK);
    const devicesBeforeRefreshTyped = devicesBeforeRefresh as DeviceView[];
    expect(devicesBeforeRefresh).toHaveLength(4);

    const findDeviceByTitle = (devices: DeviceView[], titlePrefix: string) =>
      devices.find(
        (device) =>
          typeof device.title === 'string' &&
          device.title.startsWith(titlePrefix),
      );

    const device1Before = findDeviceByTitle(
      devicesBeforeRefreshTyped,
      'Chrome',
    );
    const device2Before = findDeviceByTitle(
      devicesBeforeRefreshTyped,
      'Firefox',
    );
    const device3Before = findDeviceByTitle(
      devicesBeforeRefreshTyped,
      'Safari',
    );
    const device4Before = findDeviceByTitle(devicesBeforeRefreshTyped, 'Opera');

    expect(device1Before).toBeDefined();
    expect(device2Before).toBeDefined();
    expect(device3Before).toBeDefined();
    expect(device4Before).toBeDefined();

    if (!device1Before || !device2Before || !device3Before || !device4Before) {
      throw new Error('Expected 4 devices with unique titles');
    }

    const idsBeforeRefresh = devicesBeforeRefreshTyped
      .map((device) => device.deviceId)
      .sort();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh-token')
      .set('Cookie', device1Cookie)
      .expect(HttpStatus.OK);

    const refreshSetCookie = refreshResponse.headers['set-cookie'];
    if (!Array.isArray(refreshSetCookie) || refreshSetCookie.length === 0) {
      throw new Error('No refresh token cookie in refresh-token response');
    }
    device1Cookie = refreshSetCookie[0].split(';')[0];

    const { body: devicesAfterRefresh } = await getSecurityDevices(
      device1Cookie,
    ).expect(HttpStatus.OK);
    const devicesAfterRefreshTyped = devicesAfterRefresh as DeviceView[];
    expect(devicesAfterRefresh).toHaveLength(4);

    const idsAfterRefresh = devicesAfterRefreshTyped
      .map((device) => device.deviceId)
      .sort();
    expect(idsAfterRefresh).toEqual(idsBeforeRefresh);

    const device1AfterRefresh = devicesAfterRefreshTyped.find(
      (device) => device.deviceId === device1Before.deviceId,
    );
    if (!device1AfterRefresh) {
      throw new Error('Updated device 1 was not found');
    }
    expect(device1AfterRefresh.lastActiveDate).not.toBe(
      device1Before.lastActiveDate,
    );

    await request(app.getHttpServer())
      .delete(`/api/security/devices/${device2Before.deviceId}`)
      .set('Cookie', device1Cookie)
      .expect(HttpStatus.NO_CONTENT);

    const { body: devicesAfterDeleteDevice2 } = await getSecurityDevices(
      device1Cookie,
    ).expect(HttpStatus.OK);
    const devicesAfterDeleteDevice2Typed =
      devicesAfterDeleteDevice2 as DeviceView[];
    expect(devicesAfterDeleteDevice2).toHaveLength(3);
    expect(
      devicesAfterDeleteDevice2Typed.some(
        (device) => device.deviceId === device2Before.deviceId,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', device3Cookie)
      .expect(HttpStatus.NO_CONTENT);

    const { body: devicesAfterLogoutDevice3 } = await getSecurityDevices(
      device1Cookie,
    ).expect(HttpStatus.OK);
    const devicesAfterLogoutDevice3Typed =
      devicesAfterLogoutDevice3 as DeviceView[];
    expect(devicesAfterLogoutDevice3).toHaveLength(2);
    expect(
      devicesAfterLogoutDevice3Typed.some(
        (device) => device.deviceId === device3Before.deviceId,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .delete('/api/security/devices')
      .set('Cookie', device1Cookie)
      .expect(HttpStatus.NO_CONTENT);

    const { body: devicesAfterDeleteAllExceptCurrent } =
      await getSecurityDevices(device1Cookie).expect(HttpStatus.OK);
    expect(devicesAfterDeleteAllExceptCurrent).toHaveLength(1);
    expect(devicesAfterDeleteAllExceptCurrent[0].deviceId).toBe(
      device1Before.deviceId,
    );
  });
});
