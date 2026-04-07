import React, { useState } from 'react'
import DigitalTwinForm from './DigitalTwinForm'
import Button from '../../components/btns/Button'
import { Save, Share2, Download, ChevronRight, ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function page() {

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-12 px-6 relative">


      <div className="">
        <DigitalTwinForm />
      </div>
    </div>
  )
}

export default page


