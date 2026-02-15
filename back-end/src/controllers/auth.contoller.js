exports.registercontroller = async (req, res) => {

    try {
        const { username, email, password, phone } = req.body
        // validation
        if (!username || !password || !email || !phone) {
            return res.status(500).send({
                success: false,
                message: "all fields are required",
            })
        }
        //check user

        const exsisting = await user.findONE({ email })
        if (exsisting) {
            return res.status(500).send({
                success: false,
                message: "user already exists"
            })


        }
        // create new user 

        const user = await user.create({ username, email, password, phone })
        res.status(201).send({
            success: true,
            message: "user created successfully",
            user
        })

    } catch (err) {
        console.log(err)
        res.status(500).send({
            success: false,
            message: "error in register",
        })

    }



}