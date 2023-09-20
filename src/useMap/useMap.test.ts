import { act, renderHook } from 'voby-jasmine'

import {useMap } from './useMap'

describe('useMap()', () => {
  it('should be ok when initiated with a map', () => {
    const initialMap = new Map([[1, 'initial']])
    const { result } = renderHook(() => useMap(initialMap))

    expect(result.current[0][1]).toBe('initial')
  })

  it('should be ok when initiated with an array', () => {
    const initialArray = [[1, 'initial']]
    const { result } = renderHook(() => useMap(initialArray))

    expect(result.current[0][1]).toBe('initial')
  })

  it('should be ok when initiated without nothing', () => {
    const { result } = renderHook(() => useMap())

    expect(result.current[0]).toEqual({})
  })

  it('should add new value', () => {
    const { result } = renderHook(() => useMap())
    const [, actions] = result.current

    // expect(result.current[0]).toBeUndefined()

    act(() => actions.set(1, 'added'))

    expect(result.current[0][1]).toBe('added')
  })

  it('should update existing value', () => {
    const initialMap = new Map([[1, 'initial']])
    const { result } = renderHook(() => useMap(initialMap))
    const [, actions] = result.current

    act(() => actions.set(1, 'edited'))

    expect(result.current[0][1]).toBe('edited')
  })

  it('should setAll replaces all existing values', () => {
    const initialMap = new Map([
      [1, 'initial'],
      [2, 'example'],
    ])
    const { result } = renderHook(() => useMap(initialMap))
    const [, actions] = result.current

    expect(result.current[0][1]).toBe('initial')
    expect(result.current[0][2]).toBe('example')
    expect(Object.keys(result.current[0]).length).toBe(2)

    act(() => actions.setAll([[1, 'edited']]))

    expect(result.current[0][1]).toBe('edited')
    expect(Object.keys(result.current[0]).length).toBe(1)  
  })

  it('should remove existing value', () => {
    const initialMap = new Map([[1, 'initial']])
    const { result } = renderHook(() => useMap(initialMap))
    const [, actions] = result.current

    act(() => actions.remove(1))

    expect(result.current[0][1]).toBeUndefined()
  })

  it('should reset the map state', () => {
    const initialMap = new Map([[1, 'initial']])
    const { result } = renderHook(() => useMap(initialMap))
    const [, actions] = result.current

    act(() => actions.reset())

    expect(result.current[0][1]).toBeUndefined()
    expect(Object.keys(result.current[0]).length).toBe(0)
  })

  it('should change value reference equality after change', () => {
    const initialMap = new Map<number, number>()
    const { result } = renderHook(() => useMap(initialMap))
    const [originalMapRef, actions] = result.current

    act(() => actions.set(1, 1))

    expect(originalMapRef).toEqual(result.current[0])
    expect(originalMapRef[1]).toBe(1)
    expect(result.current[0][1]).toBe(1)
  })
  it('should keep actions reference equality after value change', () => {
    const initialMap = new Map<number, number>()
    const { result } = renderHook(() => useMap(initialMap))
    const [, originalActionsRef] = result.current

    expect(result.current[1]).toBe(originalActionsRef)

    act(() => originalActionsRef.set(1, 1))

    expect(originalActionsRef).toBe(result.current[1])
  })
})
