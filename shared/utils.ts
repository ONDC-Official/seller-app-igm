import { IUser } from '../interfaces/test'

export const getUser = (): IUser => {
  return { name: 'Test User', age: 24, gender: 'male' }
}
