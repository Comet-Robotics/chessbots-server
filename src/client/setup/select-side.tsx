import { H6 } from "@blueprintjs/core";
import type { Dispatch } from "react";

export enum DesiredSide {
    WHITE = "white",
    BLACK = "black",
    RANDOM = "random",
}
interface SelectSideProps {
    desiredSide: DesiredSide;
    onDesiredSideChange: Dispatch<DesiredSide>;
}



export function SelectSide(props: SelectSideProps) {
    return (
        <>
            <H6>Desired Side</H6>
            <select
                value={props.desiredSide}
                onChange={(e) =>
                    props.onDesiredSideChange(e.target.value as DesiredSide)
                }
            >
                <option value={DesiredSide.WHITE}>White</option>
                <option value={DesiredSide.BLACK}>Black</option>
                <option value={DesiredSide.RANDOM}>Random</option>
            </select>
        </>
    );
}
