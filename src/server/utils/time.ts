
//waits for a certain amount of time, as specified by the parameter.
//Call await waitTime(timeInMs) to do it. Returns a promise that will resolve after a set amount of time
export async function waitTime(msTime : number): Promise<void> {
    return new Promise(
        resolve => setTimeout(resolve, msTime)
    )
}