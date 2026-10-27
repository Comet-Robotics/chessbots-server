export async function sleep(time: number) {
    new Promise(resolve => setTimeout(resolve, time))
}