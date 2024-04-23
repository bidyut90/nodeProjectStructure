import { Router } from "express";
import {
    changeCurrentPassword, 
    getCurrentUser,
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails, 
    updateUserAvatra, 
    updateUserCoverImage 
} from "../controllers/user.contriller"
import { upload } from '../middlewares/multer.middleware'
import { verifyJWT } from "../middlewares/auth.middleware";

const router: Router = Router()

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    registerUser 
)

router.route('/login').post(loginUser)

router.route('/logout').post(verifyJWT,logoutUser)
router.route('/refrestoken').post(refreshAccessToken)
router.route('/change-password').post(verifyJWT,changeCurrentPassword)
router.route('/current-user').get(verifyJWT,getCurrentUser)
router.route('/update-account').patch(verifyJWT,updateAccountDetails)

router.route('/update-avatar')
.patch(verifyJWT,
upload.single("avatar"),
updateUserAvatra)


router.route('/update-coverimage')
.patch(verifyJWT,
upload.single("coverImage"),
updateUserCoverImage)

router.route('/history').get(verifyJWT,getWatchHistory)


export default router