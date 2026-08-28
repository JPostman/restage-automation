import { ReStage } from '../../restage.js';
import assert from 'node:assert/strict';

export class RmlAsserts {
  constructor(protected readonly restage: ReStage) {}

  validateUser(actual: string): void {
    assert.ok(actual.includes('"username": "emilys"'), 'Incorrect username');
    assert.ok(actual.includes('"email": "emilys@restage.local"'), 'Incorrect email');
    assert.ok(actual.includes('"role": "tester"'), 'Incorrect role');
  }

  async validateLoginUser(val: Promise<string>): Promise<void> {
    const actual = await val;
    this.validateUser(actual);
    assert.ok(actual.includes('"accessToken":'), 'Missing accessToken');
    assert.ok(actual.includes('"refreshToken":'), 'Missing refreshToken');
    assert.ok(actual.includes('"expiresInSeconds": 1800'), 'Incorrect expiration');
  }

  async validateCurrentUser(val: Promise<string>): Promise<void> {
    const actual = await val;
    this.validateUser(actual);
    assert.ok(actual.includes('"id": 1'), 'Incorrect user ID');
    assert.ok(actual.includes('"firstName": "ReStage"'), 'Incorrect first name');
    assert.ok(actual.includes('"lastName": "User"'), 'Incorrect last name');
  }

  async validateRefreshToken(val: Promise<string>): Promise<void> {
    await this.validateLoginUser(val);
    await this.validateCurrentUser(val);
  }

  async validateAccessTokenError(val: Promise<string>): Promise<void> {
    const actual = await val;
    assert.strictEqual(
      actual,
      `{
  "errors": [
    {
      "message": "Access token is required"
    }
  ]
}`,
    );
  }

  async validateRefreshTokenError(val: Promise<string>): Promise<void> {
    const actual = await val;
    assert.strictEqual(
      actual,
      `{
  "errors": [
    {
      "message": "Invalid refresh token"
    }
  ]
}`,
    );
  }

  async validateAccessRefreshTokenError(val: Promise<string>): Promise<void> {
    const actual = await val;
    assert.strictEqual(
      actual,
      `{
  "errors": [
    {
      "message": "Invalid refresh token"
    },
    {
      "message": "Access token is required"
    }
  ]
}`,
    );
  }
}
