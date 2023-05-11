import { getUser } from '../../shared/utils'

describe('get user', () => {
  it('should resolve valid user value', async () => {
    const user = getUser()
    expect(user).toEqual({ name: 'Test User', age: 24, gender: 'male' })
  })
})
