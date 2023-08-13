type ErrorProps = {
  children: string;
}

export default function Error({ children }: ErrorProps) {
  return (
    <div>
      <b>Oops! An error has occurred.</b>
      {children !== undefined && (
        <>
        <br />
        <code>
          {children}
        </code>
        </>
      )}
    </div>
  )
};
