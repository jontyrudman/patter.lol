import {useEffect, useState} from "react";

export default function LoadingDots() {
  const [dots, setDots] = useState("");


  useEffect(() => {
    const id = setTimeout(() => {
      if (dots.length === 3) {
        setDots("");
        return;
      }

      setDots(dots.concat("."));
    }, 250);

    return () => { clearTimeout(id) };
  }, [dots]);

  return (
    <>
      {dots}
    </>
  )
}
