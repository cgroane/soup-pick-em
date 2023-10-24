import { Box, Button, Heading } from 'grommet'
import React from 'react'
import styled from 'styled-components'
import { useUIContext } from '../context/ui'
import { Close } from 'grommet-icons';

const ModalBackdrop = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.3);
`
const ModalContent = styled(Box)`
  background: white;
  height: 30%;
  width: 80%;
  border-radius: 15px;
  position: relative;
  z-index: 3;
  display: block;
`
// const ModalTitle = styled(Box)`
  
// `
 
interface ModalProps extends React.PropsWithChildren {
  actions?: { 
    label: string;
    onClick: () => void;
    disable?: boolean
  }[]
}

const Modal: React.FC<ModalProps> = ({
  actions,
  children
}: ModalProps) => {
  const {
    // modalOpen,
    setModalOpen
  } = useUIContext();

  return (
    <ModalBackdrop direction='column' justify='center' align='center' >
      <ModalContent>
        <Box flex direction='row' align='center' justify='between' >
          <Heading color={'black'} level={1} >MODAL</Heading>
          <Close color='black' onClick={() => setModalOpen(false)} />
        </Box>
        <Box style={{ display: 'block'}} >
          {children}
        </Box>
        {
          actions?.length && (
            <Box>
              {actions.map(({label, onClick, disable = false}) => (
                <Button label={label} onClick={() => onClick()} disabled={disable} />
              ))}
            </Box>
          )
        }
      </ModalContent>
    </ModalBackdrop>
  )
}
 
export default Modal
 
Modal.displayName = "Modal"