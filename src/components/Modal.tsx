import { Box, Button, Text } from 'grommet'
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
  padding: 1rem;
`;

const ActionButton = styled(Button)`
  width: 50%;
  margin: 0 auto;
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
      <ModalContent direction='column' justify='between' >
        <Box flex={{ grow: 0, shrink: 0 }} direction='row' align='center' justify='between' >
          <Close fontWeight={'bold'} color='black' onClick={() => setModalOpen(false)} />
        </Box>
        <Box align='center'>
          {children}
        </Box>
        {
          actions?.length && (
            <Box>
              {actions.map(({label, onClick, disable = false}) => (
                <ActionButton primary size='small' label={<Text weight={'bold'} color={'white'} >{label}</Text>} onClick={() => onClick()} disabled={disable} />
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